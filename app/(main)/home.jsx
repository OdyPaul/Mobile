// app/home.jsx (or wherever your Home component lives)
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  TouchableWithoutFeedback,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { moderateScale as ms } from "react-native-size-matters";

const { width, height } = Dimensions.get("window");
const BOX_W = Math.round(width * 0.75);
const BOX_H = Math.round(height * 0.55);

export default function Home() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top row icons (right corner) */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          style={styles.iconBtn}
          onPress={() => router.push("/notifications")} // <-- adjust route if needed
        >
          <Ionicons name="notifications-outline" size={ms(24)} color="#111827" />
        </Pressable>
        <View style={{ width: ms(8) }} />
        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          style={styles.iconBtn}
          onPress={() => setMenuOpen((v) => !v)}
        >
          <Ionicons name="person-circle-outline" size={ms(26)} color="#111827" />
        </Pressable>
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
              router.push("/subs/vc/settings"); // <-- adjust route if needed
            }}
          >
            <Text style={styles.menuText}>Settings VC</Text>
          </Pressable>
          <View style={styles.menuDivider} />
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setMenuOpen(false);
              router.push("/profile"); // <-- adjust route if needed
            }}
          >
            <Text style={styles.menuText}>View Profile</Text>
          </Pressable>
        </View>
      )}

      {/* Middle content */}
      <View style={styles.center}>
        <Text style={styles.title}>Add credential now.</Text>

        <Pressable
          style={[styles.addBox, { width: BOX_W, height: BOX_H }]}
          onPress={() => router.push("/subs/vc/collect")} // <-- adjust route if needed
        >
          <Ionicons name="add" size={ms(44)} color="#6b7280" />
          <Text style={styles.addHint}>Click to add</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  // Top-right icons
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ms(12),
    paddingTop: ms(34),
  },
  iconBtn: {
    padding: ms(6),
    borderRadius: ms(999),
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
});
