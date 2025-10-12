import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Header({ title, onProfile, onSettings, onLogout }) {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      {/* Avatar + Dropdown */}
      <View>
        <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)}>
          <Image
            source={{ uri: "https://i.pravatar.cc/100" }}
            style={styles.avatar}
          />
        </TouchableOpacity>

        {menuVisible && (
          <View style={styles.dropdown}>
            <Pressable onPress={onProfile} style={styles.menuItem}>
              <Text style={styles.menuText}>Profile</Text>
            </Pressable>
            <Pressable onPress={onSettings} style={styles.menuItem}>
              <Text style={styles.menuText}>Settings</Text>
            </Pressable>
            <Pressable onPress={onLogout} style={styles.menuItem}>
              <Text style={[styles.menuText, { color: "red" }]}>Logout</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ✅ Title in its own wrapper */}
      <View style={styles.titleWrapper}>
        <Text style={styles.title}>My {title}</Text>
      </View>

      {/* ✅ Bell in a separate wrapper */}
      <TouchableOpacity style={styles.bellWrapper}>
        <Ionicons name="notifications-outline" size={22} color="#03A04F" />
        <View style={styles.dot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✅ Outer header background
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "rgba(231, 243, 229, 0.6)", // light transparent green
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  dropdown: {
    position: "absolute",
    top: 50,
    left: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    width: 140,
    zIndex: 999,
  },
  menuItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  menuText: {
    fontSize: 14,
    color: "#333",
  },

  // ✅ Title wrapper (solid box for text only)
  titleWrapper: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4CAF50",
  },

  // ✅ Bell wrapper separate from title
  bellWrapper: {
    backgroundColor: "rgba(3, 160, 79, 0.1)",
    padding: 8,
    borderRadius: 20,
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "red",
  },
});
