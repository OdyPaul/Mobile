// app/MainLayout.jsx
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import Spinner from "../../assets/components/spinner";
import { clearWalletConnectCache } from "../../hooks/clearWalletConnectCache";
// NOTE: ensure the import case matches your file name. If the file is Scan.jsx, use "Scan" here:
import Scan from "../../assets/components/scan";
import { useWallet } from "../../assets/store/walletStore";

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get("window").height;
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const vcs = useWallet((s) => s.vcs);
  const loadWallet = useWallet((s) => s.load);

  // hard guard to avoid multiple navigations
  const navigateOnceRef = useRef(false);
  useEffect(() => {
    if (!isScanning) navigateOnceRef.current = false;
  }, [isScanning]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync("#000000");
    NavigationBar.setButtonStyleAsync("light");
  }, []);

  useEffect(() => {
    (async () => {
      await clearWalletConnectCache();
    })();
  }, []);

  // Ensure VCs are loaded for picker
  useEffect(() => {
    loadWallet().catch(() => {});
  }, [loadWallet]);

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

      {/* VC Picker Modal */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={() => setPickerOpen(false)}
        />
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            top: "18%",
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 14,
            maxHeight: "64%",
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: 16, marginBottom: 10 }}>
            Choose a credential to share
          </Text>
          <ScrollView>
            {vcs.map((vc) => (
              <TouchableOpacity
                key={vc.id}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: "#e5e7eb",
                }}
                onPress={() => {
                  setPickerOpen(false);
                  setIsShareOpen(false);
                  router.push(`/subs/vc/share?id=${encodeURIComponent(vc.id)}`);
                }}
              >
                <Text style={{ fontWeight: "700" }}>
                  {vc?.meta?.title || "Credential"}
                </Text>
                <Text style={{ color: "#475569" }}>
                  {vc?.meta?.fullName || "—"}
                </Text>
                <Text style={{ color: "#94a3b8", fontSize: 12 }}>
                  #{vc?.meta?.studentNumber || "—"}
                </Text>
              </TouchableOpacity>
            ))}
            {vcs.length === 0 && (
              <Text style={{ color: "#6b7280", paddingVertical: 8 }}>
                No credentials yet. Use “Collect”.
              </Text>
            )}
          </ScrollView>

          <TouchableOpacity
            onPress={() => setPickerOpen(false)}
            style={{ alignSelf: "center", marginTop: 8, padding: 8 }}
          >
            <Text style={{ color: "#16A34A", fontWeight: "700" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

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
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "#16A34A",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
            onPress={() => {
              setPickerOpen(true);
            }}
          >
            <Ionicons name="barcode-outline" size={28} color="#fff" style={{ marginBottom: 5 }} />
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
              Share Credential
            </Text>
          </TouchableOpacity>

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
              setIsScanning(true);
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

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={["transparent"]}
            progressBackgroundColor="transparent"
            style={{ backgroundColor: "transparent" }}
          />
        }
      >
        {refreshing && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <Spinner size={40} color="#fff" />
          </View>
        )}

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
      </ScrollView>

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
        <Ionicons name={isShareOpen ? "close" : "barcode-outline"} size={25} color="#fff" />
      </TouchableOpacity>

      {isScanning && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#000",
            zIndex: 99,
          }}
        >
          <Scan
            onCancel={() => setIsScanning(false)}
            onComplete={(vc) => {
              if (navigateOnceRef.current) return;
              navigateOnceRef.current = true;

              setIsScanning(false);
              requestAnimationFrame(() => {
                const id = vc?.id ? String(vc.id) : "";
                if (id) router.replace(`/subs/vc/detail?id=${encodeURIComponent(id)}`);
                else router.replace("/(main)/vc");
              });
            }}
          />
        </View>
      )}
    </>
  );
}
