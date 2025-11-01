// app/vc.jsx
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useWallet } from "../../assets/store/walletStore";

export default function Vc() {
  const vcs = useWallet((s) => s.vcs);
  const load = useWallet((s) => s.load);
  const router = useRouter(); 

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={vcs}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.muted}>No credentials yet. Use “Collect”.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/subs/vc/detail?id=${encodeURIComponent(item.id)}`)}
          >
            <Text style={styles.title}>{item.meta.title || "Credential"}</Text>
            <Text style={styles.subtitle}>{item.meta.fullName || "—"}</Text>
            <Text style={styles.small}>#{item.meta.studentNumber || "—"}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { marginTop: 4, fontWeight: "600" },
  small: { marginTop: 2, color: "#6b7280" },
  muted: { color: "#6b7280", textAlign: "center", marginTop: 24 },
});
