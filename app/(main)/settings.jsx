import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
  Switch,
  ActivityIndicator,
} from "react-native";
import { useDispatch } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import {
  moderateScale,
  scale,
  verticalScale,
} from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import verificationService from "../../features/verification/verificationService"; // ✅ ADD THIS

export default function Settings() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("@biometric_pref");
        if (saved === "true") setBiometricEnabled(true);
      } catch (error) {
        console.log("Error loading biometric preference:", error);
      }
    })();
  }, []);

  const toggleBiometrics = async (value) => {
    try {
      setBiometricEnabled(value);
      await AsyncStorage.setItem("@biometric_pref", value ? "true" : "false");

      if (value) {
        const userRaw = await AsyncStorage.getItem("user");
        const user = userRaw ? JSON.parse(userRaw) : null;
        if (user?.email && user?.password) {
          await AsyncStorage.setItem("@saved_email", user.email);
          await AsyncStorage.setItem("@saved_password", user.password);
        }
      } else {
        await AsyncStorage.removeItem("@saved_email");
        await AsyncStorage.removeItem("@saved_password");
      }

      Toast.show({
        type: "success",
        text1: value ? "Biometrics enabled" : "Biometrics disabled",
      });
    } catch (error) {
      console.log("Error saving biometric preference:", error);
    }
  };

  const handleLogout = async () => {
    await dispatch(logout());
    Toast.show({
      type: "success",
      text1: "Logged Out",
      text2: "You have been logged out successfully.",
    });
    router.replace("/(auth)/login");
  };

  // ✅ EDIT PROFILE HANDLER
  const handleEditProfile = async () => {
    try {
      setLoading(true);

      const userRaw = await AsyncStorage.getItem("user");
      const user = userRaw ? JSON.parse(userRaw) : null;

      // Fetch verification requests
      const requests = await verificationService.getMyVerificationRequests();
      const hasPending = requests.some((r) => r.status === "pending");

      if (hasPending) {
        router.replace("/(setup)/pendingVerification");
      } else if (user?.verified === "unverified") {
        router.replace("/(setup)/startSetup");
      } else {
        Toast.show({
          type: "info",
          text1: "You’re already verified",
          text2: "No verification needed.",
        });
      }
    } catch (err) {
      console.log("Error in handleEditProfile:", err);
      Toast.show({
        type: "error",
        text1: "Error checking verification",
        text2: err.message || "Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      title: "Wallet Address",
      icon: "wallet-outline",
      action: () => router.replace("/subs/walletConnect"),
    },
    { title: "Change Password", icon: "lock-closed-outline" },
    { title: "Terms of Service", icon: "document-text-outline" },
    { title: "FAQs", icon: "help-circle-outline" },
    {
      title: "Log out",
      icon: "log-out-outline",
      action: () => setShowLogoutModal(true),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
            }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userEmail}>john@gmail.com</Text>
            <Text style={styles.memberSince}>Member since 3/9/2025</Text>
          </View>
        </View>

        {/* Edit Profile Button */}
        <TouchableOpacity
          style={styles.editProfileButton}
          onPress={handleEditProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.editProfileText}>Edit Profile</Text>
          )}
        </TouchableOpacity>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.action}
            >
              <View style={styles.menuLeft}>
                <Ionicons
                  name={item.icon}
                  size={moderateScale(22)}
                  color="#1E5128"
                />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={moderateScale(20)}
                color="#888"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Biometrics Switch */}
        <View style={styles.menuItem}>
          <View style={styles.menuLeft}>
            <Ionicons
              name="finger-print-outline"
              size={moderateScale(22)}
              color="#1E5128"
            />
            <Text style={styles.menuText}>Use Biometrics</Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={toggleBiometrics}
            trackColor={{ false: "#ccc", true: "#1E5128" }}
            thumbColor="#fff"
          />
        </View>

        {/* Contact Section */}
        <View style={styles.contactCard}>
          <View>
            <View style={styles.iconText}>
              <Ionicons
                name="mail-outline"
                size={moderateScale(22)}
                color="#1E5128"
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.contactText}>Email us at:</Text>
            </View>
            <Text style={styles.contactEmail}>
              psau_aas@ikswela.psau.edu.ph
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
              >
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E8F5E9",
  },
  container: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(40),
  },
  profileCard: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(20),
    flexDirection: "row",
    alignItems: "center",
    padding: scale(15),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    marginRight: scale(15),
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: moderateScale(18),
    fontWeight: "700",
    color: "#1E5128",
  },
  userEmail: {
    fontSize: moderateScale(14),
    color: "#666",
  },
  memberSince: {
    fontSize: moderateScale(12),
    color: "#888",
    marginTop: verticalScale(2),
  },
  editProfileButton: {
    backgroundColor: "#1E5128",
    borderRadius: moderateScale(25),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(15),
    marginBottom: verticalScale(20),
    alignItems: "center",
  },
  editProfileText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: moderateScale(15),
  },
  menuSection: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(20),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(10),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(5),
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuText: {
    fontSize: moderateScale(15),
    color: "#222",
    marginLeft: scale(10),
    fontWeight: "500",
  },
  contactCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: moderateScale(20),
    paddingVertical: verticalScale(15),
    marginTop: verticalScale(25),
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  iconText: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(4),
  },
  contactText: {
    color: "#1E5128",
    fontSize: moderateScale(14),
    fontWeight: "500",
  },
  contactEmail: {
    color: "#1E5128",
    fontSize: moderateScale(14),
    fontWeight: "700",
    textAlign: "center",
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    width: "80%",
    borderRadius: moderateScale(15),
    padding: verticalScale(20),
    alignItems: "center",
  },
  modalTitle: {
    fontSize: moderateScale(15),
    color: "#1E5128",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: verticalScale(15),
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: moderateScale(10),
    marginHorizontal: scale(5),
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E0E0E0",
  },
  confirmButton: {
    backgroundColor: "#1E5128",
  },
  cancelText: {
    color: "#333",
    fontWeight: "600",
  },
  confirmText: {
    color: "#fff",
    fontWeight: "600",
  },
});
