import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useDispatch } from "react-redux";
import { logout } from "../../features/auth/authSlice"; // adjust path if needed
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

export default function Settings() {
  const dispatch = useDispatch();
  const router = useRouter();

const handleLogout = async () => {
  await dispatch(logout());
  Toast.show({
    type: "success",
    text1: "Logged Out",
    text2: "You have been logged out successfully.",
  });
  router.replace("/(auth)/login");
};

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings Page</Text>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 20,
    marginBottom: 20,
    color: "#333",
  },
  logoutButton: {
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
