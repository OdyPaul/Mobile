// app/(main)/settings.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Modal,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { logout } from "../../features/auth/authSlice";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { moderateScale, scale } from "react-native-size-matters";
import { settings_styles as s } from "../../assets/styles/settings_styles";
import useHydratedUser from "../../hooks/useHydratedUser";
import useBiometricPref from "../../hooks/useBiometricPref";
import useVerificationRouting from "../../hooks/useVerificationRouting";
import useVerificationPending from "../../hooks/useVerificationPending";
// ❌ WalletConnect hook removed
// import useWalletConnector from "../../hooks/useWalletConnector";
import useSignOut from "../../hooks/useSignOut";

/**
 * Robust helper to determine if a user is verified.
 * It tolerates different field names and values like:
 * "verified", "kyc_verified", "approved", etc.
 */
/**
 * Robust helper to determine if a user is verified.
 * It tolerates different field names and values like:
 * "verified", "kyc_verified", "approved", etc.
 */
function computeIsVerified(user) {
  if (!user) return false;

  // ✅ Match RequestVC logic first: user.verified === "verified" (string)
  const verifiedStr = String(user.verified || "").trim().toLowerCase();
  if (verifiedStr === "verified") return true;

  // direct boolean flags (still supported)
  if (user.isVerified === true || user.verified === true) return true;

  // collect candidate status fields
  const candidates = [
    user.verificationStatus,
    user.status,
    user.accountStatus,
    user.kycStatus,
    user.kyc?.status,
  ];

  return candidates.some((raw) => {
    const v = String(raw || "").trim().toLowerCase();
    return v.includes("verified") || v.includes("approved");
  });
}


export default function Settings() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { user, hydrating } = useHydratedUser();
  const { enabled: biometricEnabled, toggle: toggleBiometrics } = useBiometricPref();
  const { loading, go } = useVerificationRouting(router, user);
  const { checking: checkingPending, pending } = useVerificationPending();
  // ❌ WalletConnect connector removed
  // const { isConnected, disconnectAndClear } = useWalletConnector();
  const { signOut } = useSignOut();

  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const displayName = user?.username || "—";
  const displayEmail = user?.email || "—";
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "—";

  // ✅ robust verification check
  const isVerified = computeIsVerified(user);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    // signOut already disconnects wallet + clears auth + navigates
    await signOut();
  };

  if (hydrating) {
    return (
      <SafeAreaView
        style={[
          s.safeArea,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#1E5128" />
        <Text style={{ marginTop: 10, color: "#1E5128" }}>
          Loading user data...
        </Text>
      </SafeAreaView>
    );
  }

  const menuItems = [
    // ❌ Wallet Address item removed (walletConnect page is gone)
    { title: "Change Password", icon: "lock-closed-outline" },
    { title: "Terms of Service", icon: "document-text-outline" },
    {
      title: "FAQs",
      icon: "help-circle-outline",
    },
    {
      title: "Log out",
      icon: "log-out-outline",
      action: () => setShowLogoutModal(true),
    },
  ];

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView contentContainerStyle={s.container}>
        <View style={s.profileCard}>
          <Image
            source={{
              uri: "https://cdn-icons-png.flaticon.com/512/4140/4140048.png",
            }}
            style={s.avatar}
          />
          <View style={s.profileInfo}>
            <Text style={s.userName}>{displayName}</Text>
            <Text style={s.userEmail}>{displayEmail}</Text>
            <Text style={s.memberSince}>Member since {memberSince}</Text>
          </View>
        </View>

        {/* ⬇️ ONLY this block was changed (label logic) */}
        <TouchableOpacity
          style={s.editProfileButton}
          onPress={() => {
            if (checkingPending || loading) return;
            if (pending) return router.replace("/(setup)/pendingVerification");
            if (isVerified) return router.push("/subs/settings/profile");
            // not pending and not verified → enter verification flow
            return go();
          }}
          disabled={loading || checkingPending}
        >
          {loading || checkingPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.editProfileText}>
              {pending
                ? "Account verification is pending..."
                : !isVerified
                ? "Verify account"
                : "Personal Information"}
            </Text>
          )}
        </TouchableOpacity>

        <View style={s.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={s.menuItem}
              onPress={item.action}
            >
              <View style={s.menuLeft}>
                <Ionicons
                  name={item.icon}
                  size={moderateScale(22)}
                  color="#1E5128"
                />
                <Text style={s.menuText}>{item.title}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={moderateScale(20)}
                color="#888"
              />
            </TouchableOpacity>
          ))}

          <View style={s.menuItem}>
            <View style={s.menuLeft}>
              <Ionicons
                name="finger-print-outline"
                size={moderateScale(22)}
                color="#1E5128"
              />
              <Text style={s.menuText}>Use Biometrics</Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={toggleBiometrics}
              trackColor={{ false: "#ccc", true: "#1E5128" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <View style={s.contactCard}>
          <View style={s.iconText}>
            <Ionicons
              name="mail-outline"
              size={moderateScale(22)}
              color="#1E5128"
              style={{ marginRight: scale(8) }}
            />
            <Text style={s.contactText}>Email us at:</Text>
          </View>
          <Text style={s.contactEmail}>psau@CredPocket.pro</Text>
        </View>
      </ScrollView>

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalContainer}>
            <Text style={s.modalTitle}>
              Are you sure you want to logout?
            </Text>
            <View style={s.modalButtons}>
              <TouchableOpacity
                style={[s.modalButton, s.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalButton, s.confirmButton]}
                onPress={handleLogout}
              >
                <Text style={s.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* WalletConnect modal is mounted globally in app/_layout.jsx; 
          this screen no longer references it or the walletConnect page */}
    </SafeAreaView>
  );
}
