// app/_layout.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import store from "../redux_store/store";
import { Provider, useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import { toastConfig } from "../assets/components/toast";

import { WalletConnectModal } from "@walletconnect/modal-react-native";
import { PROJECT_ID, PROVIDER_METADATA } from "../hooks/useWalletConnector";

// Modal deps
import { Modal, View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import axios from "axios";
import { useWallet } from "../assets/store/walletStore";
import { presentSession, selectSessionId } from "../features/session/verificationSessionSlice";
import { selectConsentModal, closeVerificationModal, openVerificationModal } from "../redux_store/slices/consentModalSlice";
import { presentableIdFromVc } from "../features/session/verificationSessionService";

const RAW_API = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
const apiBase = /\/api$/.test(RAW_API) ? RAW_API : `${RAW_API}/api`;

/** Watches the current session and opens the modal once /begin happens (only once per session) */
function SessionWatcher() {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { visible } = useSelector(selectConsentModal);
  const openedFor = useRef({}); // remember sessions we've already opened

  useEffect(() => {
    if (!sessionId) return;

    let stop = false;
    let lastSig = "";

    const tick = async () => {
      try {
        const r = await axios.get(`${apiBase}/verification/session/${encodeURIComponent(sessionId)}`, {
          headers: { "Cache-Control": "no-store" },
        });
        const s = r.data || {};
        const ready = !!(s?.employer?.org && s?.request?.purpose);
        const sig = `${s?.employer?.org || ""}|${s?.request?.purpose || ""}`;

        // Open modal only once when it becomes ready and not already visible
        if (ready && sig !== lastSig && !visible && !openedFor.current[sessionId]) {
          openedFor.current[sessionId] = true;
          dispatch(openVerificationModal({ sessionId }));
        }
        lastSig = sig;
      } catch {
        // ignore
      }

      if (!stop) setTimeout(tick, 2000);
    };

    tick();
    return () => { stop = true; };
  }, [sessionId, visible, dispatch]);

  return null;
}

/** Global verification modal */
function GlobalVerificationModal() {
  const dispatch = useDispatch();
  const { visible, sessionId, credentialId } = useSelector(selectConsentModal);

  const [sess, setSess] = useState(null);
  const [loading, setLoading] = useState(false); // spinner only on first fetch
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const vcs = useWallet((s) => s.vcs);
  const vcToSend = useMemo(() => {
    if (!Array.isArray(vcs) || vcs.length === 0) return null;
    if (credentialId) return vcs.find((v) => String(v.id) === String(credentialId)) || null;
    return vcs[0];
  }, [vcs, credentialId]);

  const loadSession = useCallback(
    async (showSpinner = !hasLoadedOnce) => {
      if (!visible || !sessionId) return;
      if (showSpinner) setLoading(true);
      setError("");
      try {
        const r = await axios.get(`${apiBase}/verification/session/${encodeURIComponent(sessionId)}`, {
          headers: { "Cache-Control": "no-store" },
        });
        setSess(r.data);
        setHasLoadedOnce(true);
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || "Failed to load session");
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [visible, sessionId, hasLoadedOnce]
  );

  useEffect(() => {
    if (!visible || !sessionId) return;
    loadSession(true);                        // initial fetch with spinner
    const t = setInterval(() => loadSession(false), 2000); // silent refresh
    return () => clearInterval(t);
  }, [visible, sessionId, loadSession]);

  useEffect(() => {
    if (!visible) {
      setHasLoadedOnce(false);
      setSess(null);
      setLoading(false);
      setError("");
    }
  }, [visible]);

  const onClose = () => dispatch(closeVerificationModal());

  // Approve: send using VC object (prefers payload; falls back to credential_id if available)
  const approve = async () => {
    if (!vcToSend || !sessionId) {
      Toast.show({ type: "error", text1: "No credential selected" });
      return;
    }
    setApproving(true);
    try {
      // Provide both vc and a derived credential_id fallback
      const fallbackId = presentableIdFromVc(vcToSend) || (typeof credentialId === 'string' ? credentialId : null);
      await dispatch(
        presentSession({ sessionId: String(sessionId), vc: vcToSend, credential_id: fallbackId })
      ).unwrap();

      Toast.show({ type: "success", text1: "Credential sent" });
      onClose();
    } catch (e) {
      Toast.show({ type: "error", text1: "Failed to send", text2: String(e || "Present failed") });
    } finally {
      setApproving(false);
    }
  };

  // Deny: finalize the session on the server (if supported), then close
  const deny = async () => {
    if (!sessionId) {
      onClose();
      return;
    }
    setApproving(true);
    try {
      await axios.post(
        `${apiBase}/verification/session/${encodeURIComponent(sessionId)}/present`,
        { decision: "deny" },
        { headers: { "Content-Type": "application/json" } }
      );
      Toast.show({ type: "success", text1: "Request denied" });
      onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Deny failed";
      // Even if API rejects this body, close so it doesn't pop again.
      Toast.show({ type: "error", text1: "Failed to deny", text2: String(msg) });
      onClose();
    } finally {
      setApproving(false);
    }
  };

  const org = sess?.employer?.org || "—";
  const contact = sess?.employer?.contact || "—";
  const purpose = sess?.request?.purpose || "Credential verification";

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={stylesModal.backdrop}>
        <View style={stylesModal.card}>
          <Text style={stylesModal.title}>Verification Request</Text>

          {loading ? (
            <View style={stylesModal.centerRow}>
              <ActivityIndicator />
              <Text style={stylesModal.muted}>Loading session…</Text>
            </View>
          ) : error ? (
            <>
              <Text style={stylesModal.error}>Error: {error}</Text>
              <TouchableOpacity style={[stylesModal.btn, stylesModal.btnOutline]} onPress={() => loadSession(true)}>
                <Text style={stylesModal.btnText}>Retry</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={stylesModal.row}>
                <Text style={stylesModal.label}>Organization</Text>
                <Text style={stylesModal.value}>{org}</Text>
              </View>
              <View style={stylesModal.row}>
                <Text style={stylesModal.label}>Contact</Text>
                <Text style={stylesModal.value}>{contact}</Text>
              </View>
              <View style={stylesModal.row}>
                <Text style={stylesModal.label}>Purpose</Text>
                <Text style={stylesModal.value}>{purpose}</Text>
              </View>
              <View style={[stylesModal.row, { marginTop: 8 }]} >
                <Text style={stylesModal.label}>Credential</Text>
                <Text style={stylesModal.value}>{vcToSend ? (vcToSend.meta?.title || vcToSend.id) : "—"}</Text>
              </View>

              <View style={stylesModal.actions}>
                <TouchableOpacity
                  style={[stylesModal.btn, stylesModal.btnGhost]}
                  onPress={deny}
                  disabled={approving}
                >
                  {approving ? <ActivityIndicator /> : <Text style={stylesModal.btnGhostText}>Deny</Text>}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[stylesModal.btn, stylesModal.btnDark]}
                  onPress={approve}
                  disabled={approving}
                >
                  {approving ? <ActivityIndicator color="#fff" /> : <Text style={stylesModal.btnDarkText}>Allow</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const stylesModal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,.45)", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 420, backgroundColor: "#fff", borderRadius: 14, padding: 16, borderColor: "#e5e7eb", borderWidth: 1 },
  title: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  row: { marginTop: 4 },
  label: { color: "#64748b", fontSize: 12 },
  value: { color: "#0f172a", fontSize: 16, fontWeight: "600" },
  centerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  muted: { color: "#6b7280" },
  error: { color: "#b91c1c", marginTop: 4 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  btn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 10 },
  btnDark: { backgroundColor: "#0f172a" },
  btnDarkText: { color: "#fff", fontWeight: "700" },
  btnOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1" },
  btnGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1" },
  btnGhostText: { color: "#0f172a", fontWeight: "700" },
  btnText: { color: "#0f172a", fontWeight: "700" },
});

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(setup)" />
          <Stack.Screen name="(subs)" />
          <Stack.Screen name="vc/consent" />
        </Stack>

        {/* Background watcher + Global Modal */}
        <SessionWatcher />
        <GlobalVerificationModal />

        <WalletConnectModal projectId={PROJECT_ID} providerMetadata={PROVIDER_METADATA} />
        <Toast config={toastConfig} />
      </SafeAreaProvider>
    </Provider>
  );
}
