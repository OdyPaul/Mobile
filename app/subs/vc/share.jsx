// app/subs/vc/share.jsx
import React, { useEffect, useMemo } from "react";
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../../../assets/store/walletStore";
import { useDispatch, useSelector } from "react-redux";
import {
  createSession,
  selectSessionCreating,
  selectSessionCreateErr,
  selectSessionVerifyUrl,
  selectSessionId,
} from "../../../features/session/verificationSessionSlice";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { presentableIdFromVc } from "../../../features/session/verificationSessionService";

// If set, we force links to your frontend, e.g. http://localhost:5173/verification-portal
// Supports optional placeholder: http://localhost:5173/verification-portal?session={session}
const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_BASE || "").replace(/\/+$/, "");
const ORIGIN = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

export default function ShareVC() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  // Local wallet info for header summary
  const vcs = useWallet((s) => s.vcs);
  const vc = useMemo(() => vcs.find((v) => String(v.id) === String(id)), [vcs, id]);
  const title = vc?.meta?.title || "Credential";
  const name = vc?.meta?.fullName || "—";
  const code = String(id || "").slice(-6);

  // Compute a server-resolvable credential id for links + backend lookup
  const cidForLink = useMemo(() => {
    if (!vc) return null;
    return presentableIdFromVc(vc);
  }, [vc]);

  // Redux state
  const creating = useSelector(selectSessionCreating);
  const createErr = useSelector(selectSessionCreateErr);
  const verifyUrlRaw = useSelector(selectSessionVerifyUrl);
  const sessionId = useSelector(selectSessionId);

  // Build the final link to show (prefer WEB_BASE if set)
  const verifyUrl = useMemo(() => {
    if (!sessionId) return "";

    // Prefer client-side override to point at your frontend
    if (WEB_BASE) {
      const url = /\{session\}/.test(WEB_BASE)
        ? WEB_BASE.replace("{session}", sessionId)
        : `${WEB_BASE}/${sessionId}`;
      const sep = url.includes("?") ? "&" : "?";
      // Append credential_id ONLY if resolvable
      return cidForLink ? `${url}${sep}credential_id=${encodeURIComponent(cidForLink)}` : url;
    }

    // Fallback: use server-provided URL; append credential_id ONLY if resolvable and not already present
    if (!verifyUrlRaw) return "";
    if (/\bcredential_id=/.test(verifyUrlRaw)) return verifyUrlRaw;
    const sep = verifyUrlRaw.includes("?") ? "&" : "?";
    return cidForLink ? `${verifyUrlRaw}${sep}credential_id=${encodeURIComponent(cidForLink)}` : verifyUrlRaw;
  }, [WEB_BASE, sessionId, verifyUrlRaw, cidForLink]);

  // Kick off create-session on mount (optionally bake a resolvable id into the created link)
  useEffect(() => {
    if (!ORIGIN) {
      Alert.alert("Configuration error", "EXPO_PUBLIC_API_URL is not set.");
      return;
    }
    if (id) {
      dispatch(
        createSession({
          ttlHours: 168,
          credential_id: cidForLink || undefined, // bake only if resolvable
        })
      );
    }
  }, [dispatch, id, cidForLink]);

  // Persist a hint so SessionWatcher/Modal can recover after app reloads
  useEffect(() => {
    (async () => {
      try {
        if (sessionId) {
          const key = `vc_hint_${sessionId}`;
          if (cidForLink) {
            await AsyncStorage.setItem(key, cidForLink);
          } else {
            await AsyncStorage.removeItem(key);
          }
        }
      } catch {
        // ignore storage errors
      }
    })();
  }, [sessionId, cidForLink]);

  // Native share sheet (often includes "Copy")
  const shareLink = async () => {
    if (!verifyUrl) return;
    try {
      await Share.share({ message: verifyUrl, url: verifyUrl, title: "Verify credential" });
    } catch {}
  };

  const regenerate = () => {
    if (id) {
      dispatch(
        createSession({
          ttlHours: 168,
          credential_id: cidForLink || undefined, // keep baking the resolvable id
        })
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Share Credential</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* VC summary card */}
      <View style={styles.card}>
        <Text style={styles.label}>VC</Text>
        <Text style={styles.value}>{title}</Text>
        <Text style={styles.label}>Holder</Text>
        <Text style={styles.value}>{name}</Text>
      </View>

      {/* Body */}
      {creating ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
          <Text style={styles.muted}>Creating session…</Text>
        </View>
      ) : (
        <View style={styles.content}>
          {!!createErr && (
            <View style={styles.alertWarn}>
              <Text style={styles.alertText}>Note: {createErr}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Show this to the verifier</Text>
          <View style={styles.qrWrap}>
            {verifyUrl ? (
              <QRCode value={verifyUrl} size={240} ecl="M" quietZone={10} />
            ) : (
              <Text style={styles.muted}>No link available</Text>
            )}
          </View>

          <Text style={styles.help}>
            The link expires in 7 days. The verifier will enter their org name and purpose, then your phone will be
            prompted to confirm sending this credential.
          </Text>

          {/* Selectable link (long press to copy) */}
          {verifyUrl ? (
            <View style={styles.linkBox}>
              <Text selectable numberOfLines={2} style={styles.linkText}>
                {verifyUrl}
              </Text>
              <Text style={styles.linkHint}>Long-press the link to copy</Text>
            </View>
          ) : null}

          <View style={styles.btnRow}>
            <TouchableOpacity onPress={shareLink} style={[styles.btn, styles.btnOutline]} disabled={!verifyUrl}>
              <Ionicons name="copy-outline" size={16} color="#0f172a" />
              <Text style={styles.btnText}>Copy / Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={shareLink} style={[styles.btn, styles.btnDark]} disabled={!verifyUrl}>
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={[styles.btnText, styles.btnTextDark]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={regenerate} style={[styles.btn, styles.btnGhost]}>
              <Ionicons name="refresh" size={16} color="#0f172a" />
              <Text style={styles.btnText}>Regenerate</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.codeTag}>
            <Text style={styles.codeText}>VC Code: {code}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#f1f5f9",
  },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a" },

  card: { margin: 16, padding: 16, borderRadius: 12, backgroundColor: "#f8fafc", gap: 6 },
  label: { color: "#64748b", fontSize: 12 },
  value: { color: "#0f172a", fontSize: 16, fontWeight: "600", marginBottom: 8 },

  center: { alignItems: "center", gap: 8, marginTop: 24 },
  muted: { color: "#6b7280" },

  content: { alignItems: "center", paddingHorizontal: 20 },
  sectionTitle: { fontWeight: "700", color: "#0f172a", alignSelf: "flex-start", marginLeft: 16, marginBottom: 8 },
  qrWrap: { marginVertical: 8, alignItems: "center" },
  help: { color: "#475569", fontSize: 12, textAlign: "center", paddingHorizontal: 24, marginTop: 8 },

  linkBox: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    width: "92%",
  },
  linkText: { color: "#0f172a" },
  linkHint: { marginTop: 4, fontSize: 12, color: "#64748b" },

  btnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  btn: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  btnOutline: { borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#fff" },
  btnDark: { backgroundColor: "#0f172a" },
  btnText: { color: "#0f172a", fontWeight: "700" },
  btnTextDark: { color: "#fff", fontWeight: "700" },
  btnGhost: { backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#e5e7eb" },

  codeTag: { marginTop: 10, backgroundColor: "#ecfeff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  codeText: { color: "#0e7490", fontWeight: "700" },

  alertWarn: { backgroundColor: "#fff7ed", borderColor: "#fdba74", borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 8 },
  alertText: { color: "#9a3412", fontSize: 12 },
});
