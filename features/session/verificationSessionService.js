// features/session/verificationSessionService.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../lib';

const RAW_API = (process.env.EXPO_PUBLIC_API_URL || '').replace(/\/+$/, '');
const ensureApiBase = (raw) => {
  const base = String(raw || '').replace(/\/+$/, '');
  return /\/api$/.test(base) ? base : `${base}/api`;
};
const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_BASE || '').replace(/\/+$/, '');

// ---------- shared auth headers ----------
async function buildAuthHeaders() {
  let token = null;
  try {
    token =
      (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)) ||
      (await AsyncStorage.getItem('token')) ||
      (await AsyncStorage.getItem('authToken'));
  } catch {
    token = null;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ---------- API calls ----------

// Create a verification session (returns { session_id, verifyUrl, expires_at })
export async function createVerificationSession({ ttlHours = 168, credential_id, apiOverride } = {}) {
  const base = ensureApiBase(apiOverride || RAW_API);
  const url  = `${base}/verification/session`;
  const headers = await buildAuthHeaders();

  const res = await axios.post(
    url,
    {
      ttlHours,
      // Optional. We usually pass credential_id via the portal link instead.
      ...(credential_id ? { credential_id } : {}),
      ui_base: WEB_BASE || undefined,
    },
    { headers }
  );
  return res.data;
}

// Present to a session (holder → verifier). Body: { decision, credential_id } OR { decision, payload }
export async function presentToSession(sessionId, body, apiOverride) {
  const base = ensureApiBase(apiOverride || RAW_API);
  const url = `${base}/verification/session/${encodeURIComponent(sessionId)}/present`;
  const headers = await buildAuthHeaders();
  const res = await axios.post(url, body, { headers });
  return res.data; // { ok, session, result? }
}

// ---------- Helpers ----------
const get = (obj, path) => {
  if (!obj) return undefined;
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
};
const coalesce = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

const looksLikeObjectId = (s) => typeof s === 'string' && /^[a-f0-9]{24}$/i.test(s);
const looksLikePublicKey = (s) => typeof s === 'string' && /^web_[A-Za-z0-9\-_]{6,64}$/.test(s);

/** Extract a resolvable server id from a VC (prefer public key, else mongo _id) */
export function presentableIdFromVc(vc) {
  // 1) Preferred: server "key" (e.g., web_...)
  const key = coalesce(
    get(vc, 'key'), get(vc, 'publicKey'), get(vc, 'serverKey'),
    get(vc, 'signed.key'), get(vc, 'payload.key'), get(vc, 'meta.key'),
  );
  if (looksLikePublicKey(key)) return key;

  // 2) Mongo ObjectId
  const oid = coalesce(
    get(vc, '_id'), get(vc, 'dbId'), get(vc, 'mongoId'),
    get(vc, 'signed._id'), get(vc, 'payload._id'),
  );
  if (looksLikeObjectId(oid)) return oid;

  // 3) Student identifier (your backend queries SignedVC by `student_id`)
  const student = coalesce(
    get(vc, 'student_id'),
    get(vc, 'meta.student_id'),
    get(vc, 'meta.studentId'),
    get(vc, 'meta.studentNumber'),
    get(vc, 'payload.student_id'),
    get(vc, 'credentialSubject.student_id'),
    get(vc, 'credentialSubject.studentNumber'),
  );
  if (student) return String(student);

  // 4) As a last resort, use plain vc.id only if it's clearly server-real
  const maybe = get(vc, 'id');
  if (looksLikePublicKey(maybe) || looksLikeObjectId(maybe)) return String(maybe);

  return null;
}

/**
 * Build a *strict* stateless payload:
 * require jws + salt + digest (most servers need all 3).
 * If any is missing, return null so the caller can fall back to credential_id.
 */
export function tryBuildPayloadBody(vc) {
  const jws = coalesce(
    get(vc, 'jws'), get(vc, 'compactJws'), get(vc, 'token'),
    get(vc, 'signed.jws'), get(vc, 'proof.jws'), get(vc, 'payload.jws'),
  );
  const salt = coalesce(
    get(vc, 'salt'), get(vc, 'signed.salt'), get(vc, 'proof.salt'), get(vc, 'payload.salt'),
  );
  const digest = coalesce(
    get(vc, 'digest'), get(vc, 'digestB64Url'), get(vc, 'digestBase64Url'),
    get(vc, 'signed.digest'), get(vc, 'proof.digest'), get(vc, 'payload.digest'),
  );
  const anchoring = coalesce(
    get(vc, 'anchoring'), get(vc, 'signed.anchoring'), get(vc, 'proof.anchoring'), get(vc, 'payload.anchoring'),
  );
  const alg = coalesce(get(vc, 'alg'), get(vc, 'signed.alg'), get(vc, 'payload.alg'), 'ES256');
  const kid = coalesce(get(vc, 'kid'), get(vc, 'signed.kid'), get(vc, 'payload.kid'));
  const jwk = coalesce(
    get(vc, 'jwk'), get(vc, 'issuerJwk'), get(vc, 'publicJwk'),
    get(vc, 'signed.jwk'), get(vc, 'payload.jwk'),
  );

  if (!(jws && salt && digest)) return null;

  return { payload: { jws, salt, digest, anchoring, alg, kid, jwk } };
}
