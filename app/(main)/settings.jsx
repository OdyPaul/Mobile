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
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { moderateScale, scale, verticalScale } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import verificationService from "../../features/verification/verificationService";
import { settings_styles } from "../../assets/styles/settings_styles";


export default function Settings() {
  const dispatch = useDispatch();
  const router = useRouter();

  // Redux user may be empty on first render before persistence hydrates
  const reduxUser = useSelector((s) => s.auth.user);

  const [localUser, setLocalUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [hydrating, setHydrating] = useState(true);
  

  // ✅ 1. Load user from AsyncStorage for fallback
  console.log("Redux User:", JSON.stringify(reduxUser, null, 2));

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem("user");
        setLocalUser(stored ? JSON.parse(stored) : null);
      } catch (err) {
        console.error("Error reading stored user:", err);
      } finally {
        setHydrating(false);
      }
    })();
  }, []);

  // ✅ 2. Load biometric pref
  useEffect(() => {
    (async () => {
      const pref = await AsyncStorage.getItem("@biometric_pref");
      if (pref === "true") setBiometricEnabled(true);
    })();
  }, []);

  // ✅ 3. Merge Redux + Storage fallback safely
  const user =
    reduxUser && reduxUser.email ? reduxUser : localUser && localUser.email ? localUser : null;

  // ✅ 4. Derived display fields
  const displayName = user?.username || "—";
  const displayEmail = user?.email || "—";
  const memberSince =
    user?.createdAt && !isNaN(new Date(user.createdAt))
      ? new Date(user.createdAt).toLocaleDateString()
      : "—";

  const toggleBiometrics = async (value) => {
    try {
      setBiometricEnabled(value);
      await AsyncStorage.setItem("@biometric_pref", value ? "true" : "false");
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

  const handleEditProfile = async () => {
  if (loading) return;
  try {
    setLoading(true);

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      Toast.show({ type: "error", text1: "Not authenticated", text2: "Please log in again." });
      router.replace("/(auth)/login");
      return;
    }

    const res = await verificationService.getMyVerificationRequests();
    const list = Array.isArray(res) ? res : (res?.data ?? []);
    const hasPending = list.some(r => {
      const s = String(r?.status ?? "").toLowerCase();
      return s === "pending";
    });

    if (hasPending) {
      router.replace("/(setup)/pendingVerification");
    } else if (!user?.verified || String(user.verified).toLowerCase() === "unverified") {
      router.replace("/(setup)/startSetup");
    } else {
      Toast.show({ type: "info", text1: "You’re already verified", text2: "No verification needed." });
    }
  } catch (err) {
    console.log("Error in handleEditProfile:", err);
    Toast.show({ type: "error", text1: "Error checking verification", text2: err.message || "Please try again later." });
  } finally {
    setLoading(false);
  }
};
  const menuItems = [
    { title: "Wallet Address", icon: "wallet-outline", action: () => router.replace("/subs/walletConnect") },
    { title: "Change Password", icon: "lock-closed-outline" },
    { title: "Terms of Service", icon: "document-text-outline" },
    { title: "FAQs", icon: "help-circle-outline" },
    { title: "Log out", icon: "log-out-outline", action: () => setShowLogoutModal(true) },
  ];

  // ✅ Loading state before hydration
  if (hydrating) {
    return (
      <SafeAreaView style={[settings_styles.safeArea, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1E5128" />
        <Text style={{ marginTop: 10, color: "#1E5128" }}>Loading user data...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={settings_styles.safeArea}>
      <ScrollView contentContainerStyle={settings_styles.container}>
        {/* Profile Card */}
        <View style={settings_styles.profileCard}>
          <Image
            source={{ uri: "https://cdn-icons-png.flaticon.com/512/4140/4140048.png" }}
            style={settings_styles.avatar}
          />
          <View style={settings_styles.profileInfo}>
            <Text style={settings_styles.userName}>{displayName}</Text>
            <Text style={settings_styles.userEmail}>{displayEmail}</Text>
            <Text style={settings_styles.memberSince}>Member since {memberSince}</Text>
          </View>
        </View>

        {/* Edit Profile */}
        <TouchableOpacity
          style={settings_styles.editProfileButton}
          onPress={handleEditProfile}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={settings_styles.editProfileText}>Edit Profile</Text>
          )}
        </TouchableOpacity>

        {/* Menu */}
        <View style={settings_styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={settings_styles.menuItem} onPress={item.action}>
              <View style={settings_styles.menuLeft}>
                <Ionicons name={item.icon} size={moderateScale(22)} color="#1E5128" />
                <Text style={settings_styles.menuText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={moderateScale(20)} color="#888" />
            </TouchableOpacity>
          ))}

          {/* Biometrics */}
          <View style={settings_styles.menuItem}>
            <View style={settings_styles.menuLeft}>
              <Ionicons name="finger-print-outline" size={moderateScale(22)} color="#1E5128" />
              <Text style={settings_styles.menuText}>Use Biometrics</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometrics}
              trackColor={{ false: "#ccc", true: "#1E5128" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Contact */}
        <View style={settings_styles.contactCard}>
          <View style={settings_styles.iconText}>
            <Ionicons
              name="mail-outline"
              size={moderateScale(22)}
              color="#1E5128"
              style={{ marginRight: scale(8) }}
            />
            <Text style={settings_styles.contactText}>Email us at:</Text>
          </View>
          <Text style={settings_styles.contactEmail}>psau_aas@ikswela.psau.edu.ph</Text>
        </View>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={settings_styles.modalOverlay}>
          <View style={settings_styles.modalContainer}>
            <Text style={settings_styles.modalTitle}>Are you sure you want to logout?</Text>
            <View style={settings_styles.modalButtons}>
              <TouchableOpacity
                style={[settings_styles.modalButton, settings_styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={settings_styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[settings_styles.modalButton, settings_styles.confirmButton]}
                onPress={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
              >
                <Text style={settings_styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

