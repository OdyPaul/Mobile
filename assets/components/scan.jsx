// assets/components/Scan.jsx
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { inflateRaw } from "pako";
import { decode as cborDecode } from "cborg";
import URScanSession from "../../lib/urDecoder";
import { decodeJwsPayload, vcTitleFromPayload } from "../../lib/jwsUtils";
import { useWallet } from "../../assets/store/walletStore";
import { addTicketAndTryRedeem } from "../../lib/claimQueue";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

const SCAN_COOLDOWN_MS = 180;
const STALL_MS = 2500;
const REPEAT_WINDOW = 256;

// ----------------------------------- helpers
function extractUrString(ev) {
  if (!ev) return "";
  if (typeof ev === "string") return ev;
  if (typeof ev.data === "string") return ev.data;
  if (typeof ev.rawValue === "string") return ev.rawValue;

  if (ev.data && typeof ev.data.rawValue === "string") return ev.data.rawValue;
  if (Array.isArray(ev.barcodes) && ev.barcodes[0]) {
    const b = ev.barcodes[0];
    if (typeof b.rawValue === "string") return b.rawValue;
    if (typeof b.data === "string") return b.data;
    if (typeof b.value === "string") return b.value;
  }
  if (ev.data && Array.isArray(ev.data) && typeof ev.data[0] === "string") return ev.data[0];
  if (ev.data && Array.isArray(ev.data) && ev.data[0] && typeof ev.data[0].rawValue === "string") return ev.data[0].rawValue;

  if (ev.nativeEvent && typeof ev.nativeEvent.codeStringValue === "string")
    return ev.nativeEvent.codeStringValue;

  if (ev.codes && Array.isArray(ev.codes) && ev.codes[0]) {
    const c = ev.codes[0];
    if (typeof c.rawValue === "string") return c.rawValue;
    if (typeof c.value === "string") return c.value;
  }

  if (typeof ev.raw === "string") return ev.raw;
  return "";
}

function normalizeUr(s) {
  return String(s).trim().replace(/\s+/g, "").toLowerCase();
}
function looksLikeUrPart(s) {
  return /^ur:[a-z0-9-]+\/[a-z0-9]/.test(s);
}
function getURBytes(ur) {
  if (!ur) throw new Error("No UR");
  if (typeof ur.toBuffer === "function") return ur.toBuffer();
  if (ur.buffer instanceof Uint8Array) return ur.buffer;
  throw new Error("UR payload missing bytes");
}

// --- claim URL: https(s)://<host>/c/:token
function parseClaimUrl(s) {
  try {
    const u = new URL(String(s).trim());
    const m = u.pathname.match(/^\/c\/([A-Za-z0-9._-]{8,200})$/);
    if (!m) return null;
    return { token: m[1], url: u.toString() };
  } catch {
    return null;
  }
}

// ----------------------------------- component
/**
 * Props:
 * - onComplete(vc?) -> optional callback when a VC is saved
 * - onCancel()      -> close overlay
 * - detailPath      -> route to push/replace after success (default "/subs/vc/detail")
 * - apiBase?        -> optional server base for queue redemption (e.g. "https://api.example.com")
 * - authToken?      -> optional bearer token for server-backed redemption + holder binding
 */
export default function Scan({ onComplete, onCancel, detailPath = "/subs/vc/detail", apiBase, authToken }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("idle"); // idle|scanning|done|error
  const [hint, setHint] = useState(null);

  const session = useRef(new URScanSession());
  const lastScanAt = useRef(0);
  const seenRing = useRef([]);
  const seenSet = useRef(new Set());
  const lastProgressAt = useRef(0);
  const debugCount = useRef(0);

  const addVC = useWallet((s) => s.add);
  const router = useRouter();

  useEffect(() => { if (!permission?.granted) requestPermission(); }, [permission]);
  useEffect(() => () => session.current.reset(), []);

  useEffect(() => {
    if (status !== "scanning") return;
    const now = Date.now();
    if (progress > 0) {
      lastProgressAt.current = now;
      setHint(null);
    } else if (lastProgressAt.current && now - lastProgressAt.current > STALL_MS) {
      setHint("Hold steady and fill the camera view with the QR.");
    }
  }, [progress, status]);

  function rememberFrame(s) {
    if (seenSet.current.has(s)) return true;
    seenSet.current.add(s);
    seenRing.current.push(s);
    if (seenRing.current.length > REPEAT_WINDOW) {
      const old = seenRing.current.shift();
      if (old) seenSet.current.delete(old);
    }
    return false;
  }

  async function handleScanEvent(ev) {
    const now = Date.now();
    if (now - lastScanAt.current < SCAN_COOLDOWN_MS) return;
    lastScanAt.current = now;

    const raw0 = extractUrString(ev);
    if (debugCount.current < 4) {
      console.log("SCAN raw sample:", (raw0 || "").slice(0, 140));
      debugCount.current += 1;
    }
    if (!raw0) return;

    // ---- 1) Claim URL branch (static PNG QR)
    const claim = parseClaimUrl(raw0);
    if (claim?.token && claim?.url) {
      try {
        setStatus("scanning");
        setHint("Saving token…");
        let saved = { id: null, vc: null };

        const cfg = (apiBase && authToken) ? { apiBase, authToken } : undefined;
        const res = await addTicketAndTryRedeem(
          { token: claim.token, url: claim.url, exp: null },
          async (payload) => {
            const payloadObj = decodeJwsPayload(payload.jws);
            const subj = payloadObj?.credentialSubject || {};
            const id = payload.digest || String(payload.jws).slice(0, 32);

            const vc = {
              id,
              jws: payload.jws,
              meta: {
                title: vcTitleFromPayload(payloadObj),
                fullName: subj.fullName,
                studentNumber: subj.studentNumber,
                template_id: Array.isArray(payloadObj?.type) ? payloadObj.type[1] : payloadObj?.type,
                issuedAt: payloadObj?.issuanceDate,
              },
              raw: payload,
            };
            await addVC(vc);
            saved = { id, vc };
          },
          cfg
        );

        if (res?.ok) {
          setStatus("done");
          setProgress(100);
          setHint(null);
          if (onComplete) onComplete(saved.vc || {});
          else if (saved.id) router.replace(`${detailPath}?id=${encodeURIComponent(saved.id)}`);
          else router.replace("/vc");
        } else {
          setStatus("idle");
          setHint("Saved for later. Pull to refresh VC list to retry.");
        }
      } catch (e) {
        console.warn("claim-url flow error:", e?.message || e);
        setStatus("error");
        setHint("Saved token locally. Will retry when online.");
      }
      return;
    }

    // ---- 2) UR branch (animated frames)
    const data = normalizeUr(raw0);
    if (!looksLikeUrPart(data)) return;

    const isRepeat = rememberFrame(data);
    if (status === "done") return;
    if (status !== "scanning") setStatus("scanning");

    try {
      session.current.receive(data);
    } catch (e) {
      console.warn("UR receive error:", e?.message || e);
      return;
    }

    const pct = session.current.percent || 0;
    if (pct > progress) setProgress(pct);

    if (!session.current.complete) {
      if (isRepeat && Date.now() - (lastProgressAt.current || 0) > STALL_MS) {
        setHint("Seeing repeats… try moving slightly closer/farther.");
      }
      return;
    }

    try {
      const ur = session.current.resultUr();
      const deflated = getURBytes(ur);
      const vcCborBytes = inflateRaw(deflated);
      const obj = cborDecode(vcCborBytes);

      if (obj?.format !== "vc+jws" || !obj?.jws) {
        throw new Error(`Unexpected payload format (ur.type=${ur?.type})`);
      }

      const payloadObj = decodeJwsPayload(obj.jws);
      const subj = payloadObj?.credentialSubject || {};
      const type = Array.isArray(payloadObj?.type) ? payloadObj.type[1] : payloadObj?.type;
      const id = obj.digest || String(obj.jws).slice(0, 32);

      const vc = {
        id,
        jws: obj.jws,
        meta: {
          title: vcTitleFromPayload(payloadObj),
          fullName: subj.fullName,
          studentNumber: subj.studentNumber,
          template_id: type,
          issuedAt: payloadObj?.issuanceDate,
        },
        raw: obj,
      };

      await addVC(vc);

      setStatus("done");
      setProgress(100);
      setHint(null);

      session.current.reset();
      seenRing.current = [];
      seenSet.current.clear();
      lastProgressAt.current = 0;

      if (onComplete) onComplete(vc);
      else router.replace(`${detailPath}?id=${encodeURIComponent(id)}`);
    } catch (e) {
      console.warn("scan error:", e?.message || e);
      setStatus("error");
      setHint("Couldn’t decode. Keep the QR centered and steady, then try again.");
      setTimeout(() => {
        setStatus("idle");
        setProgress(0);
        setHint(null);
        session.current.reset();
        seenRing.current = [];
        seenSet.current.clear();
        lastProgressAt.current = 0;
      }, 900);
    }
  }

  if (!permission) {
    return <View style={styles.center}><Text>Requesting camera permission...</Text></View>;
  }
  if (!permission.granted) {
    return <View style={styles.center}><Text>Camera access not granted</Text></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <CameraView
        style={{ flex: 1 }}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={(status === "idle" || status === "scanning") ? handleScanEvent : undefined}
      />

      <TouchableOpacity onPress={onCancel} activeOpacity={0.85} style={styles.closeBtn}>
        <Ionicons name="close" size={22} color="#fff" />
      </TouchableOpacity>

      <View style={styles.overlay}>
        {(status === "scanning" || progress > 0) && (
          <View style={styles.progressCard}>
            <ActivityIndicator />
            <Text style={{ color: "#fff", marginTop: 6 }}>
              Collecting credential… {progress}%
            </Text>
            {hint ? <Text style={{ color: "#9CA3AF", marginTop: 4 }}>{hint}</Text> : null}
          </View>
        )}
        {status === "error" && (
          <View style={styles.progressCard}>
            <Text style={{ color: "#fff" }}>Error, try again.</Text>
            {hint ? <Text style={{ color: "#9CA3AF", marginTop: 4 }}>{hint}</Text> : null}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  overlay: { position: "absolute", bottom: 28, left: 0, right: 0, alignItems: "center" },
  progressCard: { backgroundColor: "rgba(0,0,0,0.6)", padding: 12, borderRadius: 10, maxWidth: 320 },
  closeBtn: {
    position: "absolute",
    top: 18,
    left: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
