// app/MainLayout.jsx (or app/_layout.jsx)
// Copy–paste this whole file content for Step 2.

import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";

import { clearWalletConnectCache } from "../../hooks/clearWalletConnectCache"; 
// 👇 add this import (adjust the path if needed)
import Scan from "../.././assets/components/scan"; // if this file is app/_layout.jsx, this path is correct

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false); // 👈 NEW
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get("window").height;
  const router = useRouter(); // 👈 NEW

  // 🟢 Navigation bar styling
  useEffect(() => {
    NavigationBar.setBackgroundColorAsync("#000000");
    NavigationBar.setButtonStyleAsync("light");
  }, []);

  // 🧹 Clear wallet connect session on startup
useEffect(() => {
  (async () => {
    await clearWalletConnectCache();
  })();
}, []);

  // 🧩 Share panel animation
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isShareOpen ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isShareOpen]);

  const tabBarHeight = (Platform.OS === "ios" ? 84 : 64) + (insets.bottom ?? 0);
  const panelHeight = 150;

  const panelTranslateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight + 100, screenHeight - (panelHeight + tabBarHeight - 33)],
  });

  return (
    <>
      <StatusBar style="dark" backgroundColor="#fff" />

      {/* Overlay */}
      {isShareOpen && (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setIsShareOpen(false)}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            zIndex: 1,
          }}
        />
      )}

      {/* Bottom Sliding Panel */}
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: panelHeight,
          backgroundColor: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: panelTranslateY }],
          padding: 16,
          zIndex: 2,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: -3 },
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        <Text
          style={{
            fontWeight: "700",
            fontSize: 15,
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          Share Options
        </Text>

        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
          {/* Share Credential */}
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#16A34A",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              name="barcode-outline"
              size={28}
              color="#fff"
              style={{ marginBottom: 5 }}
            />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              Share Credential
            </Text>
          </TouchableOpacity>

          {/* Collect/Get Credential */}
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#E5E7EB",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              setIsShareOpen(false);
              setIsScanning(true); // 👈 open scanner overlay
            }}
          >
            <Ionicons
              name="cloud-download-outline"
              size={28}
              color="#16A34A"
              style={{ marginBottom: 5 }}
            />
            <Text style={{ color: "#000", fontWeight: "600", fontSize: 13 }}>
              Collect / Get Credential
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Tabs */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: "#16A34A",
          tabBarInactiveTintColor: "#A1A1AA",
          tabBarStyle: {
            backgroundColor: "#fff",
            height: tabBarHeight,
            paddingTop: 6,
            paddingBottom: (insets.bottom ?? 8) + 10,
            borderTopWidth: 0.5,
            borderTopColor: "#E5E7EB",
            ...Platform.select({
              android: { elevation: 6 },
              ios: {
                shadowColor: "#000",
                shadowOpacity: 0.06,
                shadowOffset: { width: 0, height: -3 },
                shadowRadius: 8,
              },
            }),
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="vc"
          options={{
            title: "VC",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="card-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="activity"
          options={{
            title: "Activity",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="time-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      {/* Floating Share Button */}
      <TouchableOpacity
        onPress={() => setIsShareOpen(!isShareOpen)}
        activeOpacity={0.9}
        style={{
          position: "absolute",
          bottom: (insets.bottom ?? 8) + 36,
          alignSelf: "center",
          backgroundColor: "#16A34A",
          width: 40,
          height: 40,
          borderRadius: 30,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3,
          elevation: 3,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 5,
          transform: [{ translateY: -5 }],
        }}
      >
        <Ionicons
          name={isShareOpen ? "close" : "barcode-outline"}
          size={25}
          color="#fff"
        />
      </TouchableOpacity>

      {/* 🔵 Scanner Overlay (full-screen) */}
      {isScanning && (
        <View
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: "#000",
            zIndex: 99,
          }}
        >
          <Scan
            onCancel={() => setIsScanning(false)}
             onComplete={(vc) => {
               setIsScanning(false);
               // keep history so back works:
               router.push(`/subs/vc/detail?id=${encodeURIComponent(vc.id)}`);
             }}
          />
        </View>
      )}
    </>
  );
}
