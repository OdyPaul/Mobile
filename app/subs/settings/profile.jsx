// app/subs/settings/profile.jsx
import React from "react";
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import useHydratedUser from "../../../hooks/useHydratedUser";

export default function ProfileScreen() {
  const router = useRouter();
  const { user } = useHydratedUser();

  const name = user?.fullName || user?.username || "—";
  const email = user?.email || "—";
  const since = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{name}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{email}</Text>

        <Text style={styles.label}>Member since</Text>
        <Text style={styles.value}>{since}</Text>
      </View>

      {/* add edit fields/actions here if needed */}
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
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    gap: 6,
  },
  label: { color: "#64748b", fontSize: 12 },
  value: { color: "#0f172a", fontSize: 16, fontWeight: "600", marginBottom: 8 },
});
