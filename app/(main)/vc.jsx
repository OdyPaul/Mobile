// app/vc.jsx
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../../assets/store/walletStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.86);
const SPACING = 16;
const SNAP = CARD_WIDTH + SPACING;

export default function Vc() {
  const vcs = useWallet((s) => s.vcs);
  const load = useWallet((s) => s.load);
  const remove = useWallet((s) => s.remove);
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmRemove = (id) => {
    Alert.alert(
      "Remove credential?",
      "This will permanently delete it from this device.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => { await remove(id); } },
      ]
    );
  };

  const onScrollEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SNAP);
    setIndex(Math.max(0, Math.min(i, vcs.length - 1)));
  };

  const current = vcs[index];

  return (
    <View style={styles.screen}>
      {vcs.length === 0 ? (
        <Text style={styles.muted}>No credentials yet. Use “Collect”.</Text>
      ) : (
        <>
          {/* Slider */}
          <FlatList
            ref={listRef}
            data={vcs}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SNAP}
            snapToAlignment="center"
            contentContainerStyle={{
              paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2,
            }}
            ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
            onMomentumScrollEnd={onScrollEnd}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                style={styles.card}
                onPress={() =>
                  router.push(`/subs/vc/detail?id=${encodeURIComponent(item.id)}`)
                }
              >
                {/* Decorative “card” look */}
                <View style={styles.cardBg1} />
                <View style={styles.cardBg2} />
                <View style={{ gap: 6 }}>
                  <Text style={styles.cardLabel}>
                    {item.meta.type || "Verifiable Credential"}
                  </Text>
                  <Text style={styles.cardNumber}>
                    {maskId(item.id)}
                  </Text>
                  <Text style={styles.cardName}>
                    {item.meta.fullName || "—"}
                  </Text>
                </View>

                {/* Delete icon (doesn't propagate) */}
                <Pressable
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    confirmRemove(item.id);
                  }}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </Pressable>
            )}
          />

          {/* Dots */}
          <View style={styles.dotsRow}>
            {vcs.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>

          {/* Basic info below the card */}
          {current && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>
                {current.meta.title || "Credential"}
              </Text>
              <Text style={styles.infoRow}>
                Holder: <Text style={styles.infoStrong}>{current.meta.fullName || "—"}</Text>
              </Text>
              <Text style={styles.infoRow}>
                Student No.:{" "}
                <Text style={styles.infoStrong}>
                  {current.meta.studentNumber || "—"}
                </Text>
              </Text>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() =>
                    router.push(
                      `/subs/vc/detail?id=${encodeURIComponent(current.id)}`
                    )
                  }
                >
                  <Text style={styles.primaryBtnText}>View details</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => confirmRemove(current.id)}
                >
                  <Text style={styles.secondaryBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function maskId(id = "") {
  // show last 4 chars like a card number
  const last = id.slice(-4) || "0000";
  return `•••• •••• •••• ${last}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 16 },
  muted: { color: "#6b7280", textAlign: "center", marginTop: 24 },

  // Card slider
  card: {
    width: CARD_WIDTH,
    height: 190,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#0ea5e9",
    justifyContent: "space-between",
    padding: 18,
    marginTop:"50",
  },
  cardBg1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#38bdf8",
    opacity: 0.35,
    top: -90,
    right: -40,
  },
  cardBg2: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#0369a1",
    opacity: 0.25,
    bottom: -120,
    left: -40,
  },
  cardLabel: { color: "#e0f2fe", fontWeight: "600", letterSpacing: 0.4 },
  cardNumber: { color: "white", fontSize: 22, fontWeight: "800", letterSpacing: 2 },
  cardName: { color: "white", marginTop: 8, fontWeight: "700", fontSize: 16 },
  deleteBtn: { position: "absolute", right: 10, top: 10, padding: 6, backgroundColor: "rgba(255,255,255,0.85)", borderRadius: 999 },

  // Dots
  dotsRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d1d5db" },
  dotActive: { width: 18, borderRadius: 10, backgroundColor: "#111827" },

  // Info under the card
  infoBox: {
    marginTop: 16,
    paddingHorizontal: 16,
     marginBottom: 70,
     height:"200",
  },
  infoTitle: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
  infoRow: { fontSize: 14, color: "#374151", marginTop: 4 },
  infoStrong: { fontWeight: "700", color: "#111827" },

  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  primaryBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  primaryBtnText: { color: "white", fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryBtnText: { color: "#ef4444", fontWeight: "700" },
});
