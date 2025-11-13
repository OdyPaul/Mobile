// app/setup/startSetup.jsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { s, vs } from "react-native-size-matters";

export default function StartSetup() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topBlob} />
      <Text style={styles.title}>Account Setup</Text>
      <Text style={styles.subtitle}>
        Let's get started with setting up your account.
      </Text>

      {/* Proceed → go straight to Home (no wallet / DID step) */}
      <TouchableOpacity
        style={styles.proceedButton}
        onPress={() => router.push("/personal_info")}
      >
        <Text style={styles.proceedText}>Proceed</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace("/(main)/home")}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: s(20),
  },
  topBlob: {
    position: "absolute",
    top: 0,
    width: "100%",
    height: 220,
    backgroundColor: "#4CAF50",
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
  },
  title: {
    fontSize: s(22),
    fontWeight: "700",
    marginTop: vs(120),
    marginBottom: vs(10),
    color: "#000",
  },
  subtitle: {
    fontSize: s(16),
    textAlign: "center",
    color: "#333",
    marginBottom: vs(40),
  },
  proceedButton: {
    backgroundColor: "#0066FF",
    paddingVertical: vs(14),
    borderRadius: s(20),
    width: "80%",
    alignItems: "center",
    marginBottom: vs(20),
  },
  proceedText: {
    color: "#fff",
    fontSize: s(16),
    fontWeight: "600",
  },
  skipText: {
    fontSize: s(14),
    color: "#666",
  },
});
