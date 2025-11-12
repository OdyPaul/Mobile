// app/MainLayout.jsx
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  Platform,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  AppState,
  FlatList,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import Spinner from "../../assets/components/spinner";
import { clearWalletConnectCache } from "../../hooks/clearWalletConnectCache";
import Scan from "../../assets/components/scan";
import { useWallet } from "../../assets/store/walletStore";
import { scale as s, verticalScale as vs, moderateScale as ms } from "react-native-size-matters";

/* ------------------------------ helpers ------------------------------ */
const maskId = (id = "") => {
  const sId = String(id);
  const last = sId.slice(-4) || "0000";
  return `•••• •••• •••• ${last}`;
};

const fmtDateOnly = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const da = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

const vcTypeUpper = (meta) => {
  const raw = (meta?.abbr || meta?.type || meta?.title || "").toString().trim();
  return raw ? raw.toUpperCase() : "VC";
};

const toTitle = (str = "") =>
  String(str).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

/* -------------------------------------------------------------------- */

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get("window").height;
  const router = useRouter();

  const vcs = useWallet((s) => s.vcs);
  const loadWallet = useWallet((s) => s.load);

  useEffect(() => {
    (async () => {
      try {
        const t = await AsyncStorage.getItem("authToken");
        setAuthToken(t || null);
      } catch {
        setAuthToken(null);
      }
    })();
  }, []);

  const navigateOnceRef = useRef(false);
  useEffect(() => {
    if (!isScanning) navigateOnceRef.current = false;
  }, [isScanning]);

  const API_BASE = useMemo(() => process.env.EXPO_PUBLIC_API_BASE || "", []);

  const refreshAnchoring = useCallback(async () => {
    try {
      const sync = useWallet.getState().syncAnchoring;
      if (typeof sync !== "function") return;
      if (API_BASE && authToken) {
        await sync({ apiBase: API_BASE, authToken, batchSize: 150 });
      }
    } catch {
      // ignore
    }
  }, [API_BASE, authToken]);

  const onRefresh = useCallback(() => {
    (async () => {
      setRefreshing(true);
      try {
        await loadWallet();
        await refreshAnchoring();
      } finally {
        setRefreshing(false);
      }
    })();
  }, [loadWallet, refreshAnchoring]);

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync("#000000");
    NavigationBar.setButtonStyleAsync("light");
  }, []);

  useEffect(() => {
    (async () => {
      await clearWalletConnectCache();
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await loadWallet();
      } finally {
        refreshAnchoring();
      }
    })();
  }, [loadWallet, refreshAnchoring]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshAnchoring();
    });
    return () => sub.remove();
  }, [refreshAnchoring]);

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

      {/* VC Picker Modal (vertical cards) */}
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
            left: ms(16),
            right: ms(16),
            top: "18%",
            backgroundColor: "#fff",
            borderRadius: ms(16),
            padding: ms(14),
            maxHeight: "68%",
          }}
        >
          <Text style={{ fontWeight: "800", fontSize: s(16), marginBottom: vs(10) }}>
            Choose a credential to share
          </Text>

          <FlatList
            data={vcs}
            keyExtractor={(vc) => String(vc.id)}
            ItemSeparatorComponent={() => <View style={{ height: ms(12) }} />}
            contentContainerStyle={{ paddingBottom: ms(8) }}
            showsVerticalScrollIndicator
            renderItem={({ item }) => {
              const vcId = String(item.id ?? item.digest ?? item.key ?? "");
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setPickerOpen(false);
                    setIsShareOpen(false);
                    router.push(`/subs/vc/share?id=${encodeURIComponent(vcId)}`);
                  }}
                  style={styles.shareCard}
                >
                  {/* Decorative blobs */}
                  <View style={styles.shareCardBg1} />
                  <View style={styles.shareCardBg2} />

                  {/* PSAU logo (top-right) */}
                  <View style={styles.shareLogoBadge}>
                    <Image
                      source={require("../../assets/images/psau_logo.png")}
                      style={styles.shareCardLogo}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Text block */}
                  <View style={{ gap: vs(6) }}>
                    <Text style={styles.shareCardLabel}>
                      {toTitle(item?.meta?.type || "Verifiable Credential")}
                    </Text>
                    <Text style={styles.shareCardNumber}>{maskId(vcId)}</Text>
                    <Text style={styles.shareCardName} numberOfLines={1}>
                      {item?.meta?.fullName || "—"}
                    </Text>

                    <View style={styles.shareCardMetaRow}>
                      <View style={styles.shareCardTag}>
                        <Text style={styles.shareCardTagText} numberOfLines={1}>
                          {vcTypeUpper(item?.meta)}
                        </Text>
                      </View>
                      <Text style={styles.shareIssuedText}>
                        Issued {fmtDateOnly(item?.meta?.issuedAt)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: "#6b7280", paddingVertical: vs(8) }}>
                No credentials yet. Use “Collect”.
              </Text>
            }
          />

          <TouchableOpacity
            onPress={() => setPickerOpen(false)}
            style={{ alignSelf: "center", marginTop: vs(8), padding: ms(8) }}
          >
            <Text style={{ color: "#16A34A", fontWeight: "700" }}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Shade when share panel is open */}
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

      {/* Bottom share panel */}
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
            onPress={() => setPickerOpen(true)}
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

      {/* Root container (no ScrollView here) */}
      <View style={{ flex: 1 }}>
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
              height: (Platform.OS === "ios" ? 84 : 64) + (insets.bottom ?? 0),
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
      </View>

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

const styles = StyleSheet.create({
  // Share-picker cards (vertical)
  shareCard: {
    height: vs(130),
    borderRadius: ms(14),
    overflow: "hidden",
    backgroundColor: "#065F46", // deep green
    justifyContent: "center",
    padding: ms(16),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  shareCardBg1: {
    position: "absolute",
    width: ms(180),
    height: ms(180),
    borderRadius: ms(90),
    backgroundColor: "#047857",
    opacity: 0.35,
    top: -vs(70),
    right: -ms(30),
  },
  shareCardBg2: {
    position: "absolute",
    width: ms(220),
    height: ms(220),
    borderRadius: ms(110),
    backgroundColor: "#16A34A",
    opacity: 0.22,
    bottom: -vs(100),
    left: -ms(30),
  },

  shareLogoBadge: {
    position: "absolute",
    right: ms(10),
    top: ms(10),
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: ms(20),
    padding: ms(6),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  shareCardLogo: { width: ms(28), height: ms(28) },

  shareCardLabel: { color: "#D1FAE5", fontWeight: "700", letterSpacing: 0.4 },
  shareCardNumber: { color: "#ECFDF5", fontSize: s(18), fontWeight: "800", letterSpacing: 1.5 },
  shareCardName: { color: "#FFFFFF", marginTop: vs(6), fontWeight: "800", fontSize: s(14) },

  shareCardMetaRow: {
    marginTop: vs(8),
    flexDirection: "row",
    alignItems: "center",
    gap: ms(10),
  },
  shareCardTag: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    paddingVertical: vs(3),
    paddingHorizontal: ms(8),
    borderRadius: ms(999),
  },
  shareCardTagText: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 1,
    fontSize: s(11),
    textTransform: "uppercase",
  },
  shareIssuedText: {
    color: "#ECFDF5",
    opacity: 0.9,
    fontWeight: "700",
    fontSize: s(11),
  },
});
