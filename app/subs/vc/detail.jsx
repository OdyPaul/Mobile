// app/subs/vc/detail.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { scale as s, verticalScale as vs, moderateScale as ms } from "react-native-size-matters";
import { readVC } from "../../../lib/vcStorage";
import { decodeJwsPayload } from "../../../lib/jwsUtils";
import { useWallet } from "../../../assets/store/walletStore";
import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "";

const EXPLORERS = {
  80002: {
    label: "Polygon Amoy",
    tx: (h) => `https://amoy.polygonscan.com/tx/${h}`,
    addr: (a) => `https://amoy.polygonscan.com/address/${a}`,
  },
  137: {
    label: "Polygon",
    tx: (h) => `https://polygonscan.com/tx/${h}`,
    addr: (a) => `https://polygonscan.com/address/${a}`,
  },
};

const short = (x) => (x ? `${String(x).slice(0, 8)}…${String(x).slice(-6)}` : "—");
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString() : "—");
const fmtDateOnly = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const da = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

export default function VcDetail() {
  const { id } = useLocalSearchParams();
  const [vc, setVc] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const remove = useWallet((s) => s.remove);
  const vcs = useWallet((s) => s.vcs);

  const loadLocal = useCallback(async () => {
    const v = await readVC(String(id || ""));
    setVc(v);
  }, [id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const v = await readVC(String(id || ""));
      if (alive) setVc(v);
    })();
    return () => { alive = false; };
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const v = await readVC(String(id || ""));
        if (alive) setVc(v);
      })();
      return () => { alive = false; };
    }, [id])
  );

  useEffect(() => {
    if (!id) return;
    loadLocal();
  }, [id, vcs, loadLocal]);

  const subj = useMemo(() => {
    if (!vc?.jws) return {};
    try {
      const payload = decodeJwsPayload(vc.jws);
      return payload?.credentialSubject || {};
    } catch {
      return {};
    }
  }, [vc?.jws]);

  const goBack = () => {
    if (navigation?.canGoBack?.()) navigation.goBack();
    else router.replace("/(main)/vc");
  };

  const confirmRemove = () => {
    Alert.alert("Remove credential?", "This will permanently delete it from this device.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await remove(String(id));
          router.replace("/(main)/vc");
        },
      },
    ]);
  };

  const openExplorerTx = () => {
    const tx = vc?.anchoring?.tx_hash;
    const cid = vc?.anchoring?.chain_id;
    const exp = tx && cid && EXPLORERS[cid] ? EXPLORERS[cid].tx(tx) : null;
    if (!exp) return;
    Linking.openURL(exp).catch(() => Alert.alert("Cannot open explorer", exp));
  };

  const refreshStatus = useCallback(async () => {
    try {
      const token = (await AsyncStorage.getItem("token")) || (await AsyncStorage.getItem("authToken"));
      const sync = useWallet.getState().syncAnchoring;
      if (!API_BASE || !token || typeof sync !== "function") {
        Alert.alert("Sync", "Missing API base or token.");
        return;
      }
      const r = await sync({ apiBase: API_BASE, authToken: token, batchSize: 150 });
      await loadLocal();
      Alert.alert("Sync complete", `Updated ${r.updated} of ${r.total}`);
    } catch (e) {
      Alert.alert("Sync failed", String(e?.message || e));
    }
  }, [loadLocal]);

  if (!vc) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const a = vc.anchoring || {};
  const chainLabel = a.chain_id && EXPLORERS[a.chain_id] ? EXPLORERS[a.chain_id].label : a.chain_id || "—";
  const anchored = (a.state || "").toLowerCase() === "anchored";

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + vs(8), paddingBottom: vs(10) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backRow} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={s(22)} color="#111827" />
            <Text style={styles.backText}>My Credentials</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={refreshStatus} hitSlop={10} style={{ padding: ms(6), marginRight: ms(4) }}>
              <Ionicons name="refresh" size={s(20)} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmRemove} hitSlop={10} style={styles.trashBtn}>
              <Ionicons name="trash-outline" size={s(20)} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: ms(16) }}>
        {/* BASIC DETAILS — match Activity card look */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>

          <View style={styles.row}>
            <Text style={styles.key}>VC</Text>
            <Text style={styles.val} numberOfLines={1}>
              {vc.meta?.title || vc.meta?.type || "Diploma"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>Name</Text>
            <Text style={styles.val} numberOfLines={1}>
              {vc.meta?.fullName || "—"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>Student #</Text>
            <Text style={styles.val} numberOfLines={1}>
              {vc.meta?.studentNumber || "—"}
            </Text>
          </View>

          <View style={styles.rowLast}>
            <Text style={styles.key}>Issued</Text>
            <Text style={styles.val}>{fmtDateOnly(vc.meta?.issuedAt)}</Text>
          </View>
        </View>

        {/* Anchoring info */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Anchoring</Text>
            <View style={[styles.badge, anchored ? styles.badgeGreen : styles.badgeGray]}>
              <Text style={[styles.badgeText, anchored ? styles.badgeTextGreen : styles.badgeTextGray]}>
                {anchored ? "Anchored" : "Unanchored"}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>Chain</Text>
            <Text style={styles.val}>{chainLabel}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>Batch</Text>
            <Text style={styles.val}>{a.batch_id || "—"}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.key}>Anchored At</Text>
            <Text style={styles.val}>{fmtDateTime(a.anchored_at)}</Text>
          </View>

          <View style={styles.rowLast}>
            <Text style={styles.key}>Tx</Text>
            {a.tx_hash ? (
              <TouchableOpacity onPress={openExplorerTx} hitSlop={6}>
                <Text style={styles.txLink}>{short(a.tx_hash)} ↗</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.val}>—</Text>
            )}
          </View>
        </View>

        {/* Credential Subject with capped height + inner scroll */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Credential Subject</Text>
          <View style={styles.subjectBox}>
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator
              contentContainerStyle={{ paddingRight: ms(6) }}
            >
              <Text selectable style={styles.mono}>
                {JSON.stringify(subj, null, 2)}
              </Text>
            </ScrollView>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingHorizontal: ms(8) },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backRow: { flexDirection: "row", alignItems: "center" },
  trashBtn: { padding: ms(6) },
  backText: { marginLeft: ms(2), fontSize: s(15), fontWeight: "700", color: "#111827" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Activity-like card style
  card: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: ms(12),
    padding: ms(14),
    marginBottom: vs(12),
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
      },
    }),
  },
  cardTitle: { fontSize: s(16), fontWeight: "800", color: "#0F172A", marginBottom: vs(6) },

  // Label/value rows (like your details sheet)
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: vs(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  rowLast: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: vs(8),
  },
  key: { color: "#374151", fontWeight: "800" },
  val: { color: "#0F172A", fontWeight: "700", maxWidth: "62%" },

  mono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: s(12),
    color: "#111827",
  },

  badge: { paddingHorizontal: ms(8), paddingVertical: vs(4), borderRadius: 999, borderWidth: 1 },
  badgeGreen: { backgroundColor: "#ecfdf5", borderColor: "#10b98122" },
  badgeGray: { backgroundColor: "#f3f4f6", borderColor: "#9ca3af22" },
  badgeText: { fontSize: s(12), fontWeight: "800" },
  badgeTextGreen: { color: "#065f46" },
  badgeTextGray: { color: "#374151" },

  txLink: { color: "#1d4ed8", fontWeight: "700", textDecorationLine: "underline" },

  // Capped-height scroll area for subject
  subjectBox: {
    marginTop: vs(6),
    maxHeight: vs(260),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: ms(10),
    padding: ms(10),
    backgroundColor: "#FFFFFF",
  },
});
