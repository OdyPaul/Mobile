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
  ScrollView,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

// If set, we force links to your frontend, e.g. http://localhost:5173/verification-portal
// Supports optional placeholder: http://localhost:5173/verification-portal?session={session}
const WEB_BASE = (process.env.EXPO_PUBLIC_WEB_BASE || "").replace(/\/+$/, "");
const ORIGIN = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

// --- helper to remove a query param from any URL string
function stripParam(u, name) {
  try {
    const url = new URL(u);
    url.searchParams.delete(name);
    return url.toString();
  } catch {
    return u;
  }
}

// Uppercase VC type/title/abbr for "VC : <VALUE>"
function vcTypeUpper(meta) {
  const raw = (meta?.abbr || meta?.type || meta?.title || "Credential").toString().trim();
  return raw.toUpperCase();
}

export default function ShareVC() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // Local wallet info for header summary
  const vcs = useWallet((s) => s.vcs);
  const vc = useMemo(() => vcs.find((v) => String(v.id) === String(id)), [vcs, id]);
  const name = vc?.meta?.fullName || "—";
  const vcUpper = vcTypeUpper(vc?.meta);
  const code = String(id || "").slice(-6);

  // Compute a server-resolvable credential id for backend lookup (not for URL)
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

    // Prefer client-side override → DO NOT append credential_id
    if (WEB_BASE) {
      const url = /\{session\}/.test(WEB_BASE)
        ? WEB_BASE.replace("{session}", sessionId)
        : `${WEB_BASE}/${sessionId}`;
      return url;
    }

    // Fallback: use server-provided URL; strip credential_id if present (privacy)
    if (!verifyUrlRaw) return "";
    return stripParam(verifyUrlRaw, "credential_id");
  }, [WEB_BASE, sessionId, verifyUrlRaw]);

  // Kick off create-session on mount (keep your current behavior)
  useEffect(() => {
    if (!ORIGIN) {
      Alert.alert("Configuration error", "EXPO_PUBLIC_API_URL is not set.");
      return;
    }
    if (id) {
      dispatch(
        createSession({
          ttlHours: 168,
          credential_id: cidForLink || undefined, // still sent to backend, not exposed in URL
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
          credential_id: cidForLink || undefined,
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

      {creating ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" />
          <Text style={styles.muted}>Creating session…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: (insets.bottom ?? 0) + 32 },
          ]}
          showsVerticalScrollIndicator
        >
          {/* VC summary card: inline rows with uppercase VC */}
          <View style={styles.card}>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>VC :</Text>
              <Text style={styles.kvValue}>{vcUpper}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvLabel}>Holder :</Text>
              <Text style={styles.kvValue}>{name}</Text>
            </View>
          </View>

          {/* Any error */}
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
            The link expires in 7 days. The verifier will enter their org name and purpose, then your
            phone will be prompted to confirm sending this credential.
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
            <TouchableOpacity
              onPress={shareLink}
              style={[styles.btn, styles.btnOutline]}
              disabled={!verifyUrl}
            >
              <Ionicons name="copy-outline" size={16} color="#0f172a" />
              <Text style={styles.btnText}>Copy / Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={shareLink}
              style={[styles.btn, styles.btnDark]}
              disabled={!verifyUrl}
            >
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
        </ScrollView>
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
    marginTop:20,
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

  scrollContent: { alignItems: "center", paddingHorizontal: 20, paddingTop: 12 },

  // Inline key/value rows
  card: {
    width: "92%",
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  kvRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  kvLabel: { color: "#64748b", fontSize: 13, fontWeight: "800", marginRight: 6 },
  kvValue: { color: "#0f172a", fontSize: 16, fontWeight: "800" },

  center: { alignItems: "center", gap: 8, marginTop: 24 },
  muted: { color: "#6b7280" },

  sectionTitle: {
    fontWeight: "700",
    color: "#0f172a",
    alignSelf: "flex-start",
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 8,
  },
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

  codeTag: { marginTop: 12, backgroundColor: "#ecfeff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  codeText: { color: "#0e7490", fontWeight: "700" },

  alertWarn: { backgroundColor: "#fff7ed", borderColor: "#fdba74", borderWidth: 1, padding: 8, borderRadius: 8, marginBottom: 8, width: "92%" },
  alertText: { color: "#9a3412", fontSize: 12 },
});
