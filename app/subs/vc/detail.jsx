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
import { readVC } from "../../../lib/vcStorage";
import { decodeJwsPayload } from "../../../lib/jwsUtils";
import { useWallet } from "../../../assets/store/walletStore";
import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "";

// Known explorers
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
const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

export default function VcDetail() {
  const { id } = useLocalSearchParams();
  const [vc, setVc] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const remove = useWallet((s) => s.remove);
  const vcs = useWallet((s) => s.vcs); // re-read when store updates

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
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + 8, paddingBottom: 10 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backRow} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
            <Text style={styles.backText}>My Credentials</Text>
          </TouchableOpacity>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={refreshStatus} hitSlop={10} style={{ padding: 6, marginRight: 4 }}>
              <Ionicons name="refresh" size={20} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmRemove} hitSlop={10} style={styles.trashBtn}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Basic details */}
        <View style={styles.card}>
          <Text style={styles.title}>{vc.meta?.title || "Credential"}</Text>
          <Text style={styles.item}><Text style={styles.key}>Name: </Text>{vc.meta?.fullName || "—"}</Text>
          <Text style={styles.item}><Text style={styles.key}>Student #: </Text>{vc.meta?.studentNumber || "—"}</Text>
          <Text style={styles.item}><Text style={styles.key}>Issued: </Text>{vc.meta?.issuedAt || "—"}</Text>
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

          <Text style={styles.item}><Text style={styles.key}>Chain: </Text>{chainLabel}</Text>
          <Text style={styles.item}><Text style={styles.key}>Batch: </Text>{a.batch_id || "—"}</Text>
          <Text style={styles.item}><Text style={styles.key}>Anchored At: </Text>{fmt(a.anchored_at)}</Text>

          <View style={[styles.item, { flexDirection: "row", flexWrap: "wrap" }]}>
            <Text style={styles.key}>Tx: </Text>
            {a.tx_hash ? (
              <TouchableOpacity onPress={openExplorerTx} hitSlop={6}>
                <Text style={styles.txLink}>{short(a.tx_hash)} ↗</Text>
              </TouchableOpacity>
            ) : <Text>—</Text>}
          </View>
        </View>

        {/* Subject blob */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Credential Subject</Text>
          <Text selectable style={styles.mono}>{JSON.stringify(subj, null, 2)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingHorizontal: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backRow: { flexDirection: "row", alignItems: "center" },
  trashBtn: { padding: 6 },
  backText: { marginLeft: 2, fontSize: 15, fontWeight: "700", color: "#111827" },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  item: { marginTop: 6, lineHeight: 20 },
  key: { fontWeight: "600" },
  cardTitle: { fontWeight: "700", marginBottom: 6, fontSize: 16 },

  mono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), fontSize: 12, color: "#111827" },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  badgeGreen: { backgroundColor: "#ecfdf5", borderColor: "#10b98122" },
  badgeGray: { backgroundColor: "#f3f4f6", borderColor: "#9ca3af22" },
  badgeText: { fontSize: 12, fontWeight: "800" },
  badgeTextGreen: { color: "#065f46" },
  badgeTextGray: { color: "#374151" },

  txLink: { color: "#1d4ed8", fontWeight: "700", textDecorationLine: "underline" },
});
