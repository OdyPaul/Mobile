// app/home.jsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale as ms } from "react-native-size-matters";
import * as ImagePicker from "expo-image-picker";
import { useSelector } from "react-redux";
import { selectUnreadCount } from "../../features/notif/notifSlice"; // ← adjust path if needed
import Scan from "../../assets/components/scan";

const { width, height } = Dimensions.get("window");
const BOX_W = Math.round(width * 0.75);
const BOX_H = Math.round(height * 0.55);

export default function Home() {
  const router = useRouter();

  // Read user's full name from Redux (adjust path if your shape differs)
  const fullName =
    useSelector((state) => state?.auth?.user?.fullName) ||
    useSelector((state) => state?.auth?.user?.name) ||
    "User";

  // 🔔 unread count for badge
  const unread = useSelector(selectUnreadCount) || 0;

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false); // modal for Add Credential
  const [isScanning, setIsScanning] = React.useState(false); // overlay for Scan
  const [galleryBusy, setGalleryBusy] = React.useState(false);
  const [pickedImageUri, setPickedImageUri] = React.useState(null); // passed to Scan
  const navigateOnceRef = React.useRef(false);

  React.useEffect(() => {
    if (!isScanning) navigateOnceRef.current = false;
  }, [isScanning]);

  const goDetail = (vc) => {
    if (navigateOnceRef.current) return;
    navigateOnceRef.current = true;
    setIsScanning(false);
    requestAnimationFrame(() => {
      const id = vc?.id ? String(vc.id) : "";
      if (id) router.replace(`/subs/vc/detail?id=${encodeURIComponent(id)}`);
      else router.replace("/(main)/vc");
    });
  };

  const pickFromGallery = async () => {
    try {
      setGalleryBusy(true);
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setGalleryBusy(false);
        Alert.alert("Permission needed", "Allow photo library access to import a QR image.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 1,
      });

      setGalleryBusy(false);
      if (res.canceled) return;

      const uri = res.assets?.[0]?.uri;
      if (!uri) {
        Alert.alert("No image", "Couldn’t read the selected image.");
        return;
      }

      // Hand off to your Scan overlay; Scan may decode this still image if supported.
      setPickedImageUri(uri);
      setAddOpen(false);
      setIsScanning(true);
    } catch (e) {
      setGalleryBusy(false);
      Alert.alert("Error", e?.message || "Failed to import image.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top bar: notif (left) — fullName (center) — profile (right) */}
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            style={styles.iconBtn}
            onPress={() => router.push("/(main)/activity")} // ← change to "/activity" if not in (main)
          >
            <Ionicons name="notifications-outline" size={ms(24)} color="#111827" />
            {unread > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? "99+" : String(unread)}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <Text style={styles.userName} numberOfLines={1}>
          {fullName}
        </Text>

        <View style={styles.iconWrap}>
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            style={styles.iconBtn}
            onPress={() => setMenuOpen((v) => !v)}
          >
            <Ionicons name="person-circle-outline" size={ms(26)} color="#111827" />
          </Pressable>
        </View>
      </View>

      {/* Dismiss dropdown if tapping outside */}
      {menuOpen && (
        <TouchableWithoutFeedback onPress={() => setMenuOpen(false)}>
          <View style={styles.scrim} />
        </TouchableWithoutFeedback>
      )}

      {/* User dropdown menu */}
      {menuOpen && (
        <View style={styles.menu}>
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              router.push("/settings");
            }}
          >
            <Text style={styles.menuText}>Settings</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              router.push("/subs/settings/profile");
            }}
          >
            <Text style={styles.menuText}>View Profile</Text>
          </Pressable>
        </View>
      )}

      {/* Middle content */}
      <View style={styles.center}>
        {/* Request Credential button */}
        <Pressable
          onPress={() => router.push("/subs/home/request_vc")} // adjust route if needed
          style={styles.requestBtn}
        >
          <Ionicons name="mail-outline" size={ms(18)} color="#fff" />
          <Text style={styles.requestBtnText}>Request Credential</Text>
        </Pressable>

        <Text style={styles.title}>Add credential now.</Text>

        {/* Add Credential box → opens modal with Open Scanner / Choose from Gallery */}
        <Pressable
          style={[styles.addBox, { width: BOX_W, height: BOX_H }]}
          onPress={() => setAddOpen(true)}
        >
          <Ionicons name="add" size={ms(44)} color="#6b7280" />
          <Text style={styles.addHint}>Click to add</Text>
        </Pressable>
      </View>

      {/* Add modal */}
      <Modal
        visible={addOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOpen(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add Credential</Text>

          {/* Open live scanner (uses your Scan component) */}
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "#16A34A" }]}
            onPress={() => {
              setPickedImageUri(null);
              setAddOpen(false);
              setIsScanning(true);
            }}
          >
            <Ionicons name="qr-code-outline" size={ms(22)} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>Open Scanner</Text>
          </Pressable>

          {/* Choose QR on Gallery */}
          <Pressable
            style={[styles.actionBtn, { backgroundColor: "#F3F4F6", marginTop: ms(10) }]}
            onPress={pickFromGallery}
          >
            <Ionicons name="image-outline" size={ms(22)} color="#111827" />
            <Text style={[styles.actionBtnText, { color: "#111827" }]}>
              Choose QR on Gallery
            </Text>
          </Pressable>

          {galleryBusy && (
            <View style={styles.decodingRow}>
              <ActivityIndicator />
              <Text style={styles.decodingText}>Opening gallery…</Text>
            </View>
          )}

          <Pressable style={styles.modalClose} onPress={() => setAddOpen(false)}>
            <Text style={{ color: "#16A34A", fontWeight: "700" }}>Close</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Full-screen scanner overlay (your Scan component) */}
      {isScanning && (
        <View style={styles.scannerOverlay}>
          <Scan
            imageUri={pickedImageUri /* optional: decode still image if Scan supports it */}
            onCancel={() => setIsScanning(false)}
            onComplete={goDetail}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Top bar
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(12),
    paddingTop: ms(34),
  },
  iconWrap: {
    width: ms(44), // keep left & right equal width to perfectly center middle text
    alignItems: "center",
    justifyContent: "center",
    position: "relative", // ← allow absolute-positioned badge
  },
  iconBtn: {
    padding: ms(6),
    borderRadius: ms(999),
  },
  userName: {
    flex: 1,
    textAlign: "center",
    fontSize: ms(16),
    fontWeight: "700",
    color: "#111827",
    paddingHorizontal: ms(6),
  },

  // 🔴 badge styles
  badge: {
    position: "absolute",
    top: ms(2),
    right: ms(2),
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
  badgeText: {
    color: "#fff",
    fontSize: ms(10),
    fontWeight: "800",
    lineHeight: ms(12),
  },

  // Dropdown
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 5,
  },
  menu: {
    position: "absolute",
    top: ms(46),
    right: ms(12),
    backgroundColor: "#fff",
    borderRadius: ms(12),
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: ms(8),
    shadowOffset: { width: 0, height: ms(4) },
    elevation: 6,
    zIndex: 10,
    minWidth: ms(180),
    overflow: "hidden",
  },
  menuItem: {
    paddingVertical: ms(10),
    paddingHorizontal: ms(14),
  },
  menuText: { fontSize: ms(14), color: "#111827", fontWeight: "600" },
  menuDivider: { height: 1, backgroundColor: "#f3f4f6" },

  // Center section
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: ms(16),
    gap: ms(12),
  },
  title: { fontSize: ms(20), fontWeight: "800", color: "#111827" },

  // Request button
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    backgroundColor: "#16A34A",
    paddingHorizontal: ms(14),
    paddingVertical: ms(10),
    borderRadius: ms(12),
    marginBottom: ms(8),
  },
  requestBtnText: { color: "#fff", fontWeight: "800", fontSize: ms(14) },

  // Add box
  addBox: {
    borderWidth: ms(2),
    borderStyle: "dashed",
    borderColor: "#9ca3af",
    borderRadius: ms(16),
    alignItems: "center",
    justifyContent: "center",
    gap: ms(8),
  },
  addHint: { fontSize: ms(14), color: "#6b7280", fontWeight: "700" },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: {
    position: "absolute",
    left: ms(16),
    right: ms(16),
    top: "22%",
    backgroundColor: "#fff",
    borderRadius: ms(16),
    padding: ms(16),
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: ms(10),
    shadowOffset: { width: 0, height: 6 },
  },
  modalTitle: { fontSize: ms(16), fontWeight: "800", marginBottom: ms(10), textAlign: "center" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    paddingVertical: ms(12),
    paddingHorizontal: ms(12),
    borderRadius: ms(12),
    justifyContent: "center",
  },
  actionBtnText: { fontSize: ms(14), fontWeight: "700" },
  modalClose: { marginTop: ms(10), alignSelf: "center", padding: ms(8) },

  decodingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ms(8),
    marginTop: ms(10),
    alignSelf: "center",
  },
  decodingText: { color: "#374151", fontWeight: "600" },

  // Scanner overlay
  scannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 999,
  },
});
