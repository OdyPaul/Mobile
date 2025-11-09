// app/(main)/activity.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  RefreshControl,
  StyleSheet,
  Pressable,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import {
  refreshNotifications,
  selectNotifItems,
  selectNotifLoading,
} from "../../features/notif/notifSlice";
import Spinner from "../../assets/components/spinner";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { scale as s, verticalScale as vs, moderateScale as ms } from "react-native-size-matters";

/* ----------------------------- helpers / ui copy ---------------------------- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const ordinal = (n) => {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) { case 1: return `${n}st`; case 2: return `${n}nd`; case 3: return `${n}rd`; default: return `${n}th`; }
};
const fmtStamp = (ts) => {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = ordinal(d.getDate());
  const mm = MONTHS[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd} ${mm} - ${hh}:${mi}`;
};

function copyFor(item) {
  const t = (item.type || "").toLowerCase();
  const status = String(item.status || "").toLowerCase();
  const meta = item.meta || {};
  let title = item.title || "Activity";
  let body = item.desc || "";
  let ctaLabel = null;
  let ctaAction = null;

  if (t === "account_verification" && status === "verified") {
    title = "Your profile is ready!";
    body = "Your unique Decentralized Identifier (DID) is set up. Start using it to receive and verify credentials.";
    ctaLabel = "Where can I get a credential?";
    ctaAction = { kind: "go", href: "/(main)/vc" };
  } else if (t === "account_verification" && status === "pending") {
    title = "Verification submitted";
    body = "We’ll notify you once your account has been reviewed.";
  } else if (t === "vc_request") {
    title = `${(meta?.type || "Credential")} ${status}`;
    if (status === "approved") body = "Your request has been approved.";
    else if (status === "rejected") body = "Your request was rejected.";
    else if (status === "issued") body = "Your credential has been issued.";
  } else if (t === "vc_claimed") {
    title = "Credential claimed";
    body = "Saved to your wallet on this device.";
  } else if (t === "vc_anchored") {
    title = "Credential anchored on-chain";
    const chain = meta?.chain_id ? `Chain ${meta.chain_id}` : "On-chain";
    body = `${chain}${meta?.batch_id ? ` • Batch ${meta.batch_id}` : ""}`;
    if (meta?.tx_hash && meta?.chain_id) {
      ctaLabel = "View transaction";
      ctaAction = { kind: "tx", tx: meta.tx_hash, chainId: meta.chain_id };
    }
  } else if (t === "session_present") {
    const ok = meta?.ok ? "valid" : "not valid";
    title = `Credential presented (${ok})`;
    body = meta?.reason ? `Result: ${meta.reason}` : "Presentation recorded.";
  }

  return { title, body, ctaLabel, ctaAction };
}

const EXPLORERS = {
  80002: (h) => `https://amoy.polygonscan.com/tx/${h}`,
  137: (h) => `https://polygonscan.com/tx/${h}`,
};

/* ---------------------------------- item UI --------------------------------- */
function TimelineItem({ item }) {
  const { title, body, ctaLabel, ctaAction } = copyFor(item);

  const onPressCta = async () => {
    if (!ctaAction) return;
    if (ctaAction.kind === "go") item._onGo?.(ctaAction.href);
    else if (ctaAction.kind === "tx") {
      const url = EXPLORERS[ctaAction.chainId]?.(ctaAction.tx) || null;
      if (url) Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <View style={styles.itemWrap}>
      <View style={styles.rail} />
      <View style={styles.bubble}>
        <Ionicons name={(item.icon || "person-outline")} size={s(16)} color="#374151" />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        {!!body && <Text style={styles.cardBody}>{body}</Text>}
        {!!ctaLabel && (
          <Pressable style={styles.cta} onPress={onPressCta}>
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        )}
        <Text style={styles.stamp}>{fmtStamp(item.ts)}</Text>
      </View>
    </View>
  );
}

/* ---------------------------------- screen ---------------------------------- */
export default function Activity() {
  const dispatch = useDispatch();
  const router = useRouter();
  const items = useSelector(selectNotifItems) || [];
  const loading = useSelector(selectNotifLoading);

  const [refreshing, setRefreshing] = useState(false);
  const [atTop, setAtTop] = useState(true);

  const doRefresh = useCallback(async () => {
    if (!atTop) return; // extra guard
    setRefreshing(true);
    try { await dispatch(refreshNotifications()); }
    finally { setRefreshing(false); }
  }, [dispatch, atTop]);

  useEffect(() => {
    if (!items?.length) dispatch(refreshNotifications());
  }, [dispatch, items?.length]);

  const sections = useMemo(() => {
    const grouped = new Map();
    (items || []).forEach((it) => {
      const y = new Date(it.ts).getFullYear();
      if (!grouped.has(y)) grouped.set(y, []);
      grouped.get(y).push(it);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([year, rows]) => ({
        title: String(year),
        data: rows
          .slice()
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime()),
      }));
  }, [items]);

  const renderItem = useCallback(
    ({ item }) => <TimelineItem item={{ ...item, _onGo: (href) => router.push(href) }} />,
    [router]
  );

  const Header = () => (
    <View style={styles.listHeader}>
      <Text style={styles.headerTitle}>Activity</Text>
      {loading ? <Spinner size={s(16)} color="#1f2937" /> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <SectionList
        sections={sections}
        keyExtractor={(it, idx) => String(it.id ?? it.ts ?? idx)}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHdr}>
            <Text style={styles.sectionHdrText}>{section.title}</Text>
          </View>
        )}
        ListHeaderComponent={Header}
        ListHeaderComponentStyle={styles.listHeaderStyle} // top spacing; no box look
        contentContainerStyle={{ paddingBottom: vs(80) }}
        contentInsetAdjustmentBehavior={Platform.OS === "ios" ? "automatic" : "never"}
        scrollEventThrottle={16}
        onScroll={({ nativeEvent }) => {
          const y = nativeEvent.contentOffset?.y || 0;
          setAtTop(y <= 0);
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={doRefresh}
            enabled={Platform.OS === "android" ? atTop : undefined} // Android: only at top
          />
        }
        ListEmptyComponent={
          <View style={{ paddingTop: vs(40), alignItems: "center" }}>
            <Ionicons name="notifications-off-outline" size={s(28)} color="#9ca3af" />
            <Text style={{ color: "#6b7280", marginTop: vs(8) }}>No activity yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

/* --------------------------------- styles ---------------------------------- */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F9FAFB" },

  // Header inside list, with NO box (no bg/border). Just spacing + row.
  listHeaderStyle: {
    paddingTop: vs(8),
    paddingHorizontal: ms(16),
    paddingBottom: vs(6),
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: s(20), fontWeight: "800", color: "#111827" },

  sectionHdr: {
    backgroundColor: "#EEF2FF",
    paddingVertical: vs(8),
    paddingHorizontal: ms(12),
    borderRadius: ms(8),
    marginBottom: vs(10),
    marginHorizontal: ms(16),
  },
  sectionHdrText: { color: "#4338CA", fontWeight: "800", fontSize: s(14) },

  itemWrap: {
    paddingLeft: ms(38),
    marginBottom: vs(14),
    paddingRight: ms(16),
  },
  rail: {
    position: "absolute",
    left: ms(20),
    top: 0,
    bottom: -vs(6),
    width: ms(2),
    backgroundColor: "#E5E7EB",
  },
  bubble: {
    position: "absolute",
    left: ms(12),
    top: vs(6),
    width: ms(28),
    height: ms(28),
    borderRadius: ms(20),
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: ms(12),
    padding: ms(14),
  },
  cardTitle: { fontSize: s(16), fontWeight: "800", color: "#0F172A" },
  cardBody: { marginTop: vs(8), color: "#334155", lineHeight: vs(20) },

  cta: {
    marginTop: vs(12),
    borderWidth: 1.5,
    borderColor: "#1f2937",
    paddingVertical: vs(8),
    paddingHorizontal: ms(12),
    borderRadius: ms(10),
    alignSelf: "flex-start",
  },
  ctaText: { fontWeight: "800", color: "#1f2937" },

  stamp: { marginTop: vs(12), color: "#475569", fontStyle: "italic", fontSize: s(12) },
});
