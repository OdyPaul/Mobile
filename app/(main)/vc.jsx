// app/vc.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View, Platform, Image } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch } from "react-redux";
import { scale as s, verticalScale as vs, moderateScale as ms } from "react-native-size-matters";
import { useWallet } from "../../assets/store/walletStore";
import { refreshNotifications } from "../../features/notif/notifSlice";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.86);
const SPACING = ms(16);
const SNAP = CARD_WIDTH + SPACING;

/* ------------------------------ helpers ------------------------------ */
function maskId(id = "") {
  const sId = String(id);
  const last = sId.slice(-4) || "0000";
  return `•••• •••• •••• ${last}`;
}

function fmtDateOnly(d) {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const da = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

// Uppercase version for tags & VC value
function vcTypeUpper(meta) {
  const raw = (meta?.abbr || meta?.type || meta?.title || "").toString().trim();
  return raw ? raw.toUpperCase() : "VC";
}

// Nice Title Case for the small label line
function toTitle(str = "") {
  return String(str)
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* -------------------------------------------------------------------- */

export default function Vc() {
  const vcs = useWallet((x) => x.vcs) || [];
  const load = useWallet((x) => x.load);
  const remove = useWallet((x) => x.remove);
  const router = useRouter();
  const dispatch = useDispatch();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useFocusEffect(useCallback(() => { dispatch(refreshNotifications()); }, [dispatch]));

  useEffect(() => {
    if (vcs.length === 0) setIndex(0);
    else setIndex((prev) => Math.max(0, Math.min(prev, vcs.length - 1)));
  }, [vcs.length]);

  const confirmRemove = useCallback(
    (id) => {
      Alert.alert("Remove credential?", "This will permanently delete it from this device.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => { await remove(id); } },
      ]);
    },
    [remove]
  );

  const onScrollEnd = useCallback(
    (e) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / SNAP);
      setIndex((prev) => {
        const next = Math.max(0, Math.min(i, vcs.length - 1));
        return next === prev ? prev : next;
      });
    },
    [vcs.length]
  );

  const current = useMemo(() => (vcs.length ? vcs[index] : null), [vcs, index]);

  const renderItem = useCallback(
    ({ item, index: i }) => {
      const vcId = String(item.id ?? item.digest ?? item.key ?? i);
      const onPressCard = () => {
        if (!vcId) return;
        router.push(`/subs/vc/detail?id=${encodeURIComponent(vcId)}`);
      };

      return (
        <Pressable accessibilityRole="button" style={styles.card} onPress={onPressCard}>
          {/* Decorative green blobs */}
          <View style={styles.cardBg1} />
          <View style={styles.cardBg2} />

          {/* PSAU logo — TOP RIGHT */}
          <View style={styles.logoBadge}>
            <Image
              source={require("../../assets/images/psau_logo.png")}
              style={styles.cardLogo}
              resizeMode="contain"
            />
          </View>

          {/* Card text */}
          <View style={{ gap: vs(6) }}>
            <Text style={styles.cardLabel}>
              {toTitle(item?.meta?.type || "Verifiable Credential")}
            </Text>
            <Text style={styles.cardNumber}>{maskId(vcId)}</Text>
            <Text style={styles.cardName}>{item?.meta?.fullName || "—"}</Text>

            {/* Dynamic tag based on VC type/abbr/title — UPPERCASED */}
            <View style={styles.cardTag}>
              <Text style={styles.cardTagText} numberOfLines={1}>
                {vcTypeUpper(item?.meta)}
              </Text>
            </View>
          </View>
        </Pressable>
      );
    },
    [router]
  );

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
            keyExtractor={(item, i) => String(item.id ?? item.digest ?? item.key ?? i)}
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={SNAP}
            snapToAlignment="center"
            contentContainerStyle={{ paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 }}
            ItemSeparatorComponent={() => <View style={{ width: SPACING }} />}
            onMomentumScrollEnd={onScrollEnd}
            renderItem={renderItem}
          />

          {/* Dots */}
          <View style={styles.dotsRow}>
            {vcs.map((_, i) => (
              <View key={`dot-${i}`} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          {/* Details sheet (styled like Activity cards) */}
          {current && (
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Details</Text>

              <View style={styles.sheetRow}>
                <Text style={styles.sheetKey}>VC</Text>
                <Text style={styles.sheetVal} numberOfLines={1}>
                  {vcTypeUpper(current?.meta)}
                </Text>
              </View>

              <View style={styles.sheetRow}>
                <Text style={styles.sheetKey}>Name</Text>
                <Text style={styles.sheetVal} numberOfLines={1}>
                  {current?.meta?.fullName || "—"}
                </Text>
              </View>

              <View style={styles.sheetRow}>
                <Text style={styles.sheetKey}>Student #</Text>
                <Text style={styles.sheetVal} numberOfLines={1}>
                  {current?.meta?.studentNumber || "—"}
                </Text>
              </View>

              <View style={[styles.sheetRow, styles.sheetRowLast]}>
                <Text style={styles.sheetKey}>Issued</Text>
                <Text style={styles.sheetVal}>{fmtDateOnly(current?.meta?.issuedAt)}</Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => {
                    const vcId = String(current.id ?? current.digest ?? current.key ?? "");
                    if (!vcId) return;
                    router.push(`/subs/vc/detail?id=${encodeURIComponent(vcId)}`);
                  }}
                >
                  <Text style={styles.primaryBtnText}>View details</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => {
                    const vcId = String(current.id ?? current.digest ?? current.key ?? "");
                    if (!vcId) return;
                    confirmRemove(vcId);
                  }}
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

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: vs(16), backgroundColor: "#F9FAFB" },
  muted: { color: "#6b7280", textAlign: "center", marginTop: vs(24) },

  // Card slider (DARK GREEN THEME)
  card: {
    width: CARD_WIDTH,
    height: vs(190),
    borderRadius: ms(18),
    overflow: "hidden",
    backgroundColor: "#065F46",
    justifyContent: "space-between",
    padding: ms(18),
    marginTop: vs(50),
  },
  cardBg1: {
    position: "absolute",
    width: ms(220),
    height: ms(220),
    borderRadius: ms(110),
    backgroundColor: "#047857",
    opacity: 0.35,
    top: -vs(90),
    right: -ms(40),
  },
  cardBg2: {
    position: "absolute",
    width: ms(300),
    height: ms(300),
    borderRadius: ms(150),
    backgroundColor: "#16A34A",
    opacity: 0.25,
    bottom: -vs(130),
    left: -ms(40),
  },

  // PSAU logo at TOP RIGHT
  logoBadge: {
    position: "absolute",
    right: ms(10),
    top: ms(10),
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: ms(22),
    padding: ms(6),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  cardLogo: { width: ms(32), height: ms(32) },

  cardLabel: { color: "#D1FAE5", fontWeight: "700", letterSpacing: 0.4 },
  cardNumber: { color: "#ECFDF5", fontSize: s(22), fontWeight: "800", letterSpacing: 2 },
  cardName: { color: "#FFFFFF", marginTop: vs(8), fontWeight: "800", fontSize: s(16) },

  // Dynamic VC tag
  cardTag: {
    alignSelf: "flex-start",
    marginTop: vs(6),
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    paddingVertical: vs(4),
    paddingHorizontal: ms(10),
    borderRadius: ms(999),
  },
  cardTagText: {
    color: "#FFFFFF",
    fontWeight: "900",
    letterSpacing: 1,
    fontSize: s(12),
    textTransform: "uppercase",
  },

  // Dots
  dotsRow: { marginTop: vs(10), flexDirection: "row", justifyContent: "center", gap: ms(6) },
  dot: { width: ms(6), height: ms(6), borderRadius: ms(3), backgroundColor: "#d1d5db" },
  dotActive: { width: ms(18), borderRadius: ms(10), backgroundColor: "#111827" },

  // Details sheet (match Activity card look)
  sheet: {
    marginTop: vs(14),
    marginHorizontal: ms(12),
    marginBottom: vs(70),
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: ms(12),
    padding: ms(17),
    ...Platform.select({
      android: { elevation: 1 },
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
      },
    }),
  },
  sheetTitle: { fontSize: s(16), fontWeight: "800", color: "#0F172A", marginBottom: vs(6) },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: vs(8),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  sheetRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  sheetKey: { color: "#374151", fontWeight: "800" },
  sheetVal: { color: "#0F172A", fontWeight: "700", maxWidth: "60%" },

  actionsRow: { flexDirection: "row", gap: ms(10), marginTop: vs(14) },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#0B3D2E",
    paddingVertical: vs(10),
    paddingHorizontal: ms(14),
    borderRadius: ms(12),
    alignItems: "center",
  },
  primaryBtnText: { color: "white", fontWeight: "800" },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: vs(10),
    paddingHorizontal: ms(14),
    borderRadius: ms(12),
    alignItems: "center",
  },
  secondaryBtnText: { color: "#ef4444", fontWeight: "800" },
});
