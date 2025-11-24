// app/home.jsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  Image,
  Modal,
  Platform,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale as ms } from "react-native-size-matters";
import { useSelector } from "react-redux";
import { selectUnreadCount } from "../../features/notif/notifSlice"; // adjust if needed
import { useWallet } from "../../assets/store/walletStore";

export default function Home() {
  const router = useRouter();
  const [confirmReqOpen, setConfirmReqOpen] = useState(false);

  // Name + notif count
  const fullName =
    useSelector((s) => s?.auth?.user?.fullName) ||
    useSelector((s) => s?.auth?.user?.name) ||
    "User";
  const unread = useSelector(selectUnreadCount) || 0;

  // VC count (load on focus so it's fresh)
  const vcs = useWallet((x) => x.vcs) || [];
  const load = useWallet((x) => x.load);
  useFocusEffect(
    useCallback(() => {
      load?.();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* U-shaped top container */}
      <View style={styles.heroWrap}>
        {/* HEADER: bell — name — profile */}
        <View style={styles.topRow}>
          <Pressable
            style={styles.iconBtn}
            hitSlop={10}
            onPress={() => router.push("/(main)/activity")}
          >
            <Ionicons name="notifications-outline" size={ms(24)} color="#111827" />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? "99+" : String(unread)}</Text>
              </View>
            )}
          </Pressable>

          <Text style={styles.userName} numberOfLines={1}>
            {fullName}
          </Text>

          <Pressable
            style={styles.iconBtn}
            hitSlop={10}
            onPress={() => router.push("/subs/settings/profile")}
          >
            <Ionicons name="person-circle-outline" size={ms(26)} color="#111827" />
          </Pressable>
        </View>

        {/* Greeting + CTA */}
        <View style={styles.greetBlock}>
          <Text style={styles.greet}>Hello, {fullName} 👋</Text>
          <Text style={styles.subtle}>Request Credential Now!</Text>

          <Pressable style={styles.requestBtn} onPress={() => setConfirmReqOpen(true)}>
            <Ionicons name="checkmark-circle-outline" size={ms(18)} color="#fff" />
            <Text style={styles.requestBtnText}>Request Credential</Text>
          </Pressable>
        </View>

        {/* Key/person image, centered */}
        <View style={styles.heroImageBox}>
          <Image
            source={require("../../assets/images/home-logo.png")} // person-with-key image
            style={styles.heroImg}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* CONTENT BELOW THE U-CONTAINER */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Credentials</Text>

        {/* Diploma row with very light shadow + count */}
        <Pressable
          style={styles.diplomaRow}
          onPress={() => router.push("/(main)/vc")}
        >
          <View style={styles.diplomaLeft}>
            <Image
              source={require("../../assets/images/home-vc-logo.png")}
              style={styles.diplomaImg}
              resizeMode="contain"
            />
            <Text style={styles.vcCount}>Active VC: {vcs.length}</Text>
          </View>
          <Ionicons name="chevron-forward" size={ms(22)} color="#111827" />
        </Pressable>
      </View>

      {/* Confirm Modal */}
      <Modal
        transparent
        visible={confirmReqOpen}
        animationType="fade"
        onRequestClose={() => setConfirmReqOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request Credential?</Text>
            <Text style={styles.modalDesc}>
              Are you sure you want to request your digital credential?
            </Text>

            <Pressable
              style={styles.modalConfirmBtn}
              onPress={() => {
                setConfirmReqOpen(false);
                router.push("/subs/home/request_vc");
              }}
            >
              <Text style={styles.modalConfirmText}>Yes, Request Now</Text>
            </Pressable>

            <Pressable style={styles.modalCancelBtn} onPress={() => setConfirmReqOpen(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const CARD_RADIUS = ms(22);

const styles = StyleSheet.create({
  // Slightly gray page so the white U-container stands out
  container: {
    flex: 1,
    backgroundColor: "#F6F7F9",
  },

  /* U-shaped top container */
  heroWrap: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: ms(16),
    paddingTop: Platform.select({ ios: ms(8), android: ms(14) }),
    paddingBottom: ms(16),
    borderBottomLeftRadius: CARD_RADIUS,
    borderBottomRightRadius: CARD_RADIUS,
    // soft drop to separate from gray background
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: ms(10),
        shadowOffset: { width: 0, height: ms(6) },
      },
      android: { elevation: 2 },
    }),
  },

  /* HEADER */
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: ms(15),
    marginTop: ms(25),
  },
  iconBtn: { padding: ms(6), borderRadius: 999, position: "relative" },
  userName: {
    flexShrink: 1,
    textAlign: "center",
    fontSize: ms(16),
    fontWeight: "700",
    color: "#111827",
  },
  badge: {
    position: "absolute",
    top: ms(-2),
    right: ms(-2),
    minWidth: ms(16),
    height: ms(16),
    paddingHorizontal: ms(3),
    borderRadius: ms(8),
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: ms(10), fontWeight: "800", lineHeight: ms(12) },

  /* Greeting + CTA */
  greetBlock: { marginTop: ms(6) },
  greet: { fontSize: ms(20), fontWeight: "800", color: "#111827", marginBottom: ms(4) },
  subtle: { fontSize: ms(13), color: "#6B7280", marginBottom: ms(10) },

  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ms(8),
    backgroundColor: "#16A34A",
    paddingVertical: ms(12),
    borderRadius: ms(14),
    marginBottom: ms(30),
    marginTop:ms(15),
  },
  requestBtnText: { color: "#fff", fontWeight: "800", fontSize: ms(15) },

  // Image sits inside the same U-container; centered
  heroImageBox: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroImg: { width: "92%", height: ms(180) },

  /* BELOW CONTENT */
  content: {
    flex: 1,
    paddingHorizontal: ms(16),
    paddingTop: ms(14),
  },
  sectionTitle: {
    fontSize: ms(20),
    fontWeight: "700",
    color: "#111827",
    marginBottom: ms(15),
    marginTop: ms(15),

  },

  // Light, not heavy: border + tiny elevation only
  diplomaRow: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: ms(16),
    borderWidth: 1,
    borderColor: "#E7E9EE",
    paddingVertical: ms(10),
    paddingHorizontal: ms(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.03,
        shadowRadius: ms(6),
        shadowOffset: { width: 0, height: ms(3) },
      },
      android: { elevation: 1 },
    }),
  },
  diplomaLeft: { flexDirection: "row", alignItems: "center", gap: ms(12) },
  diplomaImg: { width: ms(110), height: ms(70) },
  vcCount: { fontSize: ms(13), fontWeight: "700", color: "#374151" },

  /* MODAL */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: ms(20),
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: ms(16),
    padding: ms(20),
  },
  modalTitle: { fontSize: ms(18), fontWeight: "800", textAlign: "center", marginBottom: ms(10) },
  modalDesc: { textAlign: "center", fontSize: ms(14), color: "#555", marginBottom: ms(20) },
  modalConfirmBtn: {
    backgroundColor: "#16A34A",
    borderRadius: ms(12),
    paddingVertical: ms(12),
    marginBottom: ms(10),
  },
  modalConfirmText: { color: "#fff", textAlign: "center", fontWeight: "700" },
  modalCancelBtn: { paddingVertical: ms(10) },
  modalCancelText: { color: "#16A34A", textAlign: "center", fontWeight: "700" },
});
