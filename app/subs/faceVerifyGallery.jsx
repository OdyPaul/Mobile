// app/subs/FaceVerifyGallery.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useDispatch } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from "react-native-size-matters";
import { addLocalNotification } from "../../features/notif/notifSlice";

// ✅ Your TensorFlow face verification component
import FaceVerifier from "../../assets/components/faceVerifier";

export default function FaceVerifyGallery() {
  const { selfieUri: selfieParam, idUri: idParam } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  // Local image state (can come from params or gallery)
  const [selfieUri, setSelfieUri] = useState("");
  const [idUri, setIdUri] = useState("");

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  // On first mount, hydrate from params if provided
  useEffect(() => {
    if (selfieParam) setSelfieUri(String(selfieParam));
    if (idParam) setIdUri(String(idParam));
  }, [selfieParam, idParam]);

  const aUri = useMemo(() => String(selfieUri || ""), [selfieUri]);
  const bUri = useMemo(() => String(idUri || ""), [idUri]);
  const canVerify = !!aUri && !!bUri;

  // Ask for gallery permission once (lazy request on first pick)
  const ensureMediaPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "We need access to your photos to pick images."
      );
      return false;
    }
    return true;
  }, []);

  const pickImageFor = useCallback(
    async (kind) => {
      const ok = await ensureMediaPermission();
      if (!ok) return;

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (res.canceled) return;
      const uri = res.assets?.[0]?.uri;
      if (!uri) return;

      if (kind === "selfie") setSelfieUri(uri);
      if (kind === "id") setIdUri(uri);
      // reset previous result when changing images
      setResult(null);
    },
    [ensureMediaPermission]
  );

  // Called by FaceVerifier when comparison is done
  const onVerifierComplete = useCallback(
    (res) => {
      // expected: { ok, score, threshold, reason }
      const ok = !!res?.ok;
      const score = typeof res?.score === "number" ? res.score : null;
      const threshold =
        typeof res?.threshold === "number" ? res.threshold : null;
      const reason = res?.reason || (ok ? "match" : "no_match");

      setResult({ ok, score, threshold, reason });
      setRunning(false);

      // ✅ Push a local notification into Activity
      dispatch(
        addLocalNotification({
          type: "face_verify",
          title: ok ? "Face match passed" : "Face match failed",
          desc:
            score != null
              ? `Score ${score.toFixed(2)}${
                  threshold != null ? ` • threshold ${threshold}` : ""
                }`
              : "",
          status: ok ? "ok" : "failed",
          icon: ok ? "happy-outline" : "alert-circle-outline",
          meta: {
            ok,
            score,
            threshold,
            reason,
            selfieUri: aUri,
            idUri: bUri,
          },
          ts: Date.now(),
        })
      );

      Alert.alert(
        ok ? "✅ Face Match!" : "❌ Face Match Failed",
        score != null
          ? `Score: ${score.toFixed(2)}${
              threshold != null ? `\nThreshold: ${threshold}` : ""
            }`
          : reason || "Completed",
        [
          { text: "OK" },
          {
            text: "View Activity",
            onPress: () => router.push("/(main)/activity"),
          },
        ]
      );
    },
    [dispatch, router, aUri, bUri]
  );

  const handleRun = useCallback(() => {
    if (!canVerify) {
      Alert.alert(
        "Missing images",
        "Please pick both the selfie and the reference image first."
      );
      return;
    }
    setResult(null);
    setRunning(true);
    // FaceVerifier will run when startKey changes from "idle" → something unique
  }, [canVerify]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Face Verify</Text>
        <View style={{ width: ms(36) }} />
      </View>

      {/* Two boxes "gallery" picker */}
      <View style={styles.galleryRow}>
        {/* Selfie box */}
        <TouchableOpacity
          style={styles.box}
          activeOpacity={0.8}
          onPress={() => pickImageFor("selfie")}
        >
          <Text style={styles.boxLabel}>Selfie</Text>
          {!!aUri ? (
            <ExpoImage
              source={{ uri: aUri }}
              style={styles.img}
              contentFit="cover"
            />
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons
                name="person-circle-outline"
                size={s(40)}
                color="#94a3b8"
              />
              <Text style={styles.emptyText}>Tap to pick selfie</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Reference box */}
        <TouchableOpacity
          style={styles.box}
          activeOpacity={0.8}
          onPress={() => pickImageFor("id")}
        >
          <Text style={styles.boxLabel}>Reference</Text>
          {!!bUri ? (
            <ExpoImage
              source={{ uri: bUri }}
              style={styles.img}
              contentFit="cover"
            />
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons
                name="card-outline"
                size={s(40)}
                color="#94a3b8"
              />
              <Text style={styles.emptyText}>Tap to pick reference</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Result banner */}
      {result ? (
        <View
          style={[
            styles.result,
            result.ok ? styles.resultOk : styles.resultFail,
          ]}
        >
          <Text style={styles.resultText}>
            {result.ok ? "Face match!" : "Face mismatch"}
            {typeof result.score === "number"
              ? ` • Score ${result.score.toFixed(2)}`
              : ""}
            {typeof result.threshold === "number"
              ? ` • Thresh ${result.threshold}`
              : ""}
          </Text>
        </View>
      ) : null}

      {/* Run button */}
      <TouchableOpacity
        style={[styles.runBtn, (!canVerify || running) && { opacity: 0.6 }]}
        disabled={!canVerify || running}
        onPress={handleRun}
      >
        {running ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.runBtnText}>Run Face Verify</Text>
        )}
      </TouchableOpacity>

      {/* Invisible TF runner – kicks in when running + URIs available */}
      {canVerify && (
        <FaceVerifier
          sourceUri={aUri}
          targetUri={bUri}
          startKey={running ? `${aUri}|${bUri}|${Date.now()}` : "idle"}
          onComplete={onVerifierComplete}
          // threshold prop is optional; FaceVerifier uses default if omitted
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },

  header: {
    height: vs(56),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ms(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  backBtn: {
    width: ms(36),
    height: ms(36),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: ms(18),
    backgroundColor: "#f1f5f9",
  },
  title: { fontSize: s(18), fontWeight: "800", color: "#0f172a" },

  galleryRow: {
    flexDirection: "row",
    gap: ms(12),
    paddingHorizontal: ms(12),
    paddingTop: vs(12),
  },
  box: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: ms(12),
    overflow: "hidden",
  },
  boxLabel: {
    paddingHorizontal: ms(10),
    paddingVertical: vs(8),
    fontSize: s(12),
    fontWeight: "800",
    color: "#334155",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  img: { width: "100%", height: vs(220) },
  emptyBox: {
    height: vs(220),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    gap: vs(8),
  },
  emptyText: { color: "#64748b", fontWeight: "700", fontSize: s(12) },

  result: {
    marginHorizontal: ms(12),
    marginTop: vs(12),
    paddingVertical: vs(10),
    paddingHorizontal: ms(12),
    borderRadius: ms(10),
    borderWidth: 1,
  },
  resultOk: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
  resultFail: { backgroundColor: "#fff1f2", borderColor: "#fecdd3" },
  resultText: { fontWeight: "800", color: "#0f172a" },

  runBtn: {
    marginTop: vs(16),
    marginHorizontal: ms(12),
    backgroundColor: "#0f172a",
    borderRadius: ms(12),
    paddingVertical: vs(12),
    alignItems: "center",
  },
  runBtnText: { color: "#fff", fontWeight: "800", fontSize: s(16) },
});
