// app/(setup)/pendingVerification.js
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

export default function PendingVerification() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your verification request is pending.</Text>
      <Text style={styles.subtitle}>
        Please wait for admin approval before proceeding.
      </Text>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => router.replace("/(main)/home")}
      >
        <Text style={styles.homeButtonText}>Go to Home</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E5128",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 25,
  },
  homeButton: {
    backgroundColor: "#1E5128",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
