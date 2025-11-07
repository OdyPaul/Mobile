// app/subs/vc/detail.jsx (adjust path if different)
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { readVC } from "../../../lib/vcStorage";
import { decodeJwsPayload } from "../../../lib/jwsUtils";
import { useWallet } from "../../../assets/store/walletStore";
import { Buffer } from "buffer";
global.Buffer = global.Buffer || Buffer;

export default function VcDetail() {
  const { id } = useLocalSearchParams();
  const [vc, setVc] = useState(null);
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const remove = useWallet((s) => s.remove);

  useEffect(() => {
    let alive = true;
    (async () => {
      const v = await readVC(String(id || ""));
      if (alive) setVc(v);
    })();
    return () => { alive = false; };
  }, [id]);

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
    Alert.alert(
      "Remove credential?",
      "This will permanently delete it from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await remove(String(id));
            router.replace("/(main)/vc");
          },
        },
      ]
    );
  };

  if (!vc) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header with back + delete */}
      <View
        style={[
          styles.header,
          { paddingTop: (insets?.top ?? 0) + 8, paddingBottom: 10 },
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backRow} onPress={goBack} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color="#111827" />
            <Text style={styles.backText}>My Credentials</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={confirmRemove} hitSlop={10} style={styles.trashBtn}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.card}>
          <Text style={styles.title}>{vc.meta.title}</Text>
          <Text style={styles.item}><Text style={styles.key}>Name: </Text>{vc.meta.fullName || "—"}</Text>
          <Text style={styles.item}><Text style={styles.key}>Student #: </Text>{vc.meta.studentNumber || "—"}</Text>
          <Text style={styles.item}><Text style={styles.key}>Issued: </Text>{vc.meta.issuedAt || "—"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Credential Subject</Text>
          <Text selectable style={styles.mono}>{JSON.stringify(subj, null, 2)}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backRow: { flexDirection: "row", alignItems: "center" },
  trashBtn: { padding: 6 },

  backText: { marginLeft: 2, fontSize: 15, fontWeight: "700", color: "#111827" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 6 },
  item: { marginTop: 4 },
  key: { fontWeight: "600" },
  cardTitle: { fontWeight: "700", marginBottom: 6 },
  mono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
    fontSize: 12,
    color: "#111827",
  },
});
