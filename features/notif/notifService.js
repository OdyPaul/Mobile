// features/notif/notifService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useWallet } from "../../assets/store/walletStore";
import verificationService from "../verification/verificationService";
import { STORAGE_KEYS } from "../../lib";

/* --------------------------------- config --------------------------------- */
const LS_LAST_SEEN_AT = "notif:lastSeenAt";
export async function getLastSeenAt() {
  const raw = await AsyncStorage.getItem(LS_LAST_SEEN_AT);
  return raw ? Number(raw) : 0;
}

export async function setLastSeenAt(ts) {
  await AsyncStorage.setItem(LS_LAST_SEEN_AT, String(ts));
}

const ORIGIN = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE ||
  process.env.API_BASE_URL ||
  ""
).replace(/\/+$/, "");

const BASE_URL = `${ORIGIN}/api`;

/* --------------------------- axios (bearer + json) ------------------------- */

const api = axios.create({ baseURL: BASE_URL, timeout: 25_000 });

api.interceptors.request.use(async (config) => {
  try {
    const token =
      (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)) ||
      (await AsyncStorage.getItem("token"));
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }
  } catch {}
  config.headers = {
    "Content-Type": "application/json",
    ...(config.headers || {}),
  };
  return config;
});

/* --------- local store for ad-hoc events (e.g., session presentation) ------ */

const STORAGE_EVENTS = "notifLocalEventsV1";

async function loadLocalEvents() {
  try {
    const s = await AsyncStorage.getItem(STORAGE_EVENTS);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

async function saveLocalEvents(list) {
  try {
    await AsyncStorage.setItem(STORAGE_EVENTS, JSON.stringify(list || []));
  } catch {}
}

/** Programmatic way to append a one-off local event */
export async function recordLocalEvent(evt) {
  const nowed = { ...evt, ts: evt?.ts || Date.now() };
  const list = await loadLocalEvents();
  const next = [nowed, ...list].slice(0, 200); // cap to 200
  await saveLocalEvents(next);
  return nowed;
}

/* -------------------------------- helpers ---------------------------------- */

const toISO = (d) => {
  try {
    const x = new Date(d);
    return Number.isNaN(x.getTime()) ? null : x.toISOString();
  } catch {
    return null;
  }
};

const safeDate = (d) => {
  const iso = toISO(d);
  return iso ? new Date(iso).getTime() : Date.now();
};

function normItem({
  id,
  ts,
  type,
  title,
  desc = "",
  status = "",
  icon = "",
  meta = {},
}) {
  return {
    id: String(id || `${type}-${ts}-${Math.random().toString(36).slice(2, 7)}`),
    ts: typeof ts === "number" ? ts : safeDate(ts),
    type,
    title,
    desc,
    status,
    icon,
    meta,
  };
}

/* ------------------- server-sourced notifications (REST) ------------------- */

async function fetchVcRequestsMine() {
  // Some apps mount under /api/mobile/vc-requests; others /api/vc-requests
  const paths = ["/mobile/vc-requests/mine", "/vc-requests/mine"];
  for (const p of paths) {
    try {
      const res = await api.get(p);
      return Array.isArray(res.data) ? res.data : [];
    } catch (e) {
      if (e?.response?.status === 404) continue;
      if (e?.code === "ERR_NETWORK") continue;
    }
  }
  return [];
}

function makeFromVerificationRequests(list) {
  return (list || []).map((r) =>
    normItem({
      id: `acctvr-${r._id}`,
      ts: r.updatedAt || r.createdAt,
      type: "account_verification",
      title: `Account verification ${String(r.status || "pending")}`,
      desc: r?.student?.fullName || r?.personal?.fullName || "",
      status: String(r.status || "pending"),
      icon: "shield-checkmark-outline",
      meta: { requestId: r._id, did: r.did || null },
    })
  );
}

function makeFromVcRequests(list) {
  return (list || []).map((r) =>
    normItem({
      id: `vcreq-${r._id}`,
      ts: r.updatedAt || r.createdAt,
      type: "vc_request",
      title: `${String(r.type || "VC")} ${String(r.status || "pending")}`,
      desc: r.studentFullName || r.studentNumber || "",
      status: String(r.status || "pending"),
      icon: "document-text-outline",
      meta: { requestId: r._id, type: r.type, purpose: r.purpose },
    })
  );
}

/* -------------------- local-derived notifications (wallet) ------------------ */

function makeFromLocalVCs(vcs) {
  const out = [];
  for (const v of vcs || []) {
    const id = String(v.id ?? v.digest ?? v.key ?? "");
    const title = v?.meta?.title || "Credential";

    // claimed
    if (v.claimed_at) {
      out.push(
        normItem({
          id: `vcclaimed-${id}`,
          ts: v.claimed_at,
          type: "vc_claimed",
          title: `Credential claimed`,
          desc: title,
          status: "ok",
          icon: "download-outline",
          meta: { id, digest: v.digest || null, key: v.key || null },
        })
      );
    }

    // anchored
    if (v.anchoring?.state === "anchored") {
      out.push(
        normItem({
          id: `vcanchored-${id}`,
          ts: v.anchoring?.anchored_at || v.updatedAt || Date.now(),
          type: "vc_anchored",
          title: `Credential anchored on-chain`,
          desc: `${title} • chain ${v.anchoring?.chain_id || "?"}`,
          status: "anchored",
          icon: "link-outline",
          meta: {
            id,
            digest: v.digest || null,
            key: v.key || null,
            chain_id: v.anchoring?.chain_id,
            batch_id: v.anchoring?.batch_id,
            tx_hash: v.anchoring?.tx_hash,
          },
        })
      );
    }
  }
  return out;
}

function makeFromLocalSessionEvents(list) {
  return (list || [])
    .filter(Boolean)
    .map((e) =>
      normItem({
        id: e.id || `sess-${e.sessionId || e.meta?.sessionId || e.ts}`,
        ts: e.ts,
        type: "session_present",
        title: e.title || `VC presented`,
        desc: e.desc || (e?.meta?.reason ? `Result: ${e.meta.reason}` : ""),
        status: e.status || e?.meta?.reason || "",
        icon: "qr-code-outline",
        meta: e.meta || {},
      })
    );
}

/* ------------------------------ public API -------------------------------- */

export async function fetchAllNotifications() {
  // 1) Account verification requests
  let acctReqs = [];
  try {
    const res = await verificationService.getMyVerificationRequests();
    acctReqs = makeFromVerificationRequests(res || []);
  } catch {
    acctReqs = [];
  }

  // 2) VC requests (TOR/DIPLOMA)
  let vcReqs = [];
  try {
    const rows = await fetchVcRequestsMine();
    vcReqs = makeFromVcRequests(rows || []);
  } catch {
    vcReqs = [];
  }

  // 3) Local wallet-derived: claimed/anchored
  let walletEvents = [];
  try {
    const vcs = useWallet.getState().vcs || [];
    walletEvents = makeFromLocalVCs(vcs);
  } catch {
    walletEvents = [];
  }

  // 4) Local session-present events
  const localSess = await loadLocalEvents();
  const sessionEvents = makeFromLocalSessionEvents(localSess);

  // Merge + sort newest-first
  const all = [...acctReqs, ...vcReqs, ...walletEvents, ...sessionEvents].sort(
    (a, b) => b.ts - a.ts
  );

  return all;
}
