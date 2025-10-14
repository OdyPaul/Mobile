// app/setup/Confirm.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, Image, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert, LogBox
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { s, vs } from "react-native-size-matters";
import * as ImageManipulator from "expo-image-manipulator";
import { isAddress, getAddress } from "ethers";

import { createVerificationRequest } from "../../features/verification/verificationSlice";
import { uploadSelfie, uploadId } from "../../features/photo/photoSlice";

LogBox.ignoreLogs(["InternalBytecode.js", "ENOENT: no such file or directory"]);

const shrink = async (uri) => {
  try {
    const r = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return r.uri;
  } catch {
    return uri;
  }
};

const safeParse = (data) => {
  try {
    if (!data) return {};
    if (typeof data === "object") return data;
    const s = String(data).trim();
    return s.startsWith("{") || s.startsWith("[") ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

const normalizeDid = (candidate) => {
  if (!candidate) return null;
  try {
    // Accept did:polygon:0x..., plain 0x..., or db-stored 0x...
    let addr = candidate.startsWith("did:polygon:")
      ? candidate.slice("did:polygon:".length)
      : candidate;

    if (!addr.startsWith("0x")) return null;
    if (!isAddress(addr)) return null;

    return `did:polygon:${getAddress(addr)}`;
  } catch {
    return null;
  }
};

export default function Confirm() {
  const { personal, education, selfieUri, idUri, idType } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const reduxUser = useSelector((s) => s.auth.user);

  const [did, setDid] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false); // hard guard vs double submit

  // Resolve DID once (walletSession → Redux → AsyncStorage)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) walletConnect persisted address
        const walletSessionRaw = await AsyncStorage.getItem("walletSession");
        const walletAddr = walletSessionRaw ? JSON.parse(walletSessionRaw)?.address : null;

        // 2) redux user (new flat or older nested shapes)
        const reduxAddr =
          reduxUser?.did ||
          reduxUser?.walletAddress ||
          reduxUser?.user?.did ||
          reduxUser?.user?.walletAddress ||
          null;

        // 3) storage fallback
        const userRaw = await AsyncStorage.getItem("user");
        const stored = userRaw ? JSON.parse(userRaw) : null;
        const storedAddr =
          stored?.did ||
          stored?.walletAddress ||
          stored?.user?.did ||
          stored?.user?.walletAddress ||
          null;

        const chosen = walletAddr || reduxAddr || storedAddr || null;
        const normalized = normalizeDid(chosen);
        if (mounted) setDid(normalized);
        console.log("🔗 DID candidate:", chosen, "→", normalized);
      } catch (e) {
        if (mounted) setDid(null);
      }
    })();
    return () => { mounted = false; };
  }, [reduxUser]);

  const personalData = safeParse(personal);
  const educationData = safeParse(education);

  const validate = () => {
    if (!did) {
      Alert.alert("Link wallet", "Please link your wallet before submitting.");
      return false;
    }
    if (!personalData?.fullName || !personalData?.address || !personalData?.birthPlace || !personalData?.birthDate) {
      Alert.alert("Missing info", "Personal information is incomplete.");
      return false;
    }
    if (!educationData?.highSchool || !educationData?.admissionDate || !educationData?.graduationDate) {
      Alert.alert("Missing info", "Education information is incomplete.");
      return false;
    }
    if (!selfieUri || !idUri) {
      Alert.alert("Missing images", "Please provide both a selfie and a valid ID.");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (inFlightRef.current) return; // prevent duplicates
    if (!validate()) return;

    inFlightRef.current = true;
    setLoading(true);
    try {
      // Uploads happen ONLY after validation passed
      const [shrunkSelfie, shrunkId] = await Promise.all([
        shrink(selfieUri),
        shrink(idUri),
      ]);

      const [selfieRes, idRes] = await Promise.all([
        dispatch(uploadSelfie({ uri: shrunkSelfie, name: "selfie.jpg", type: "image/jpeg" })).unwrap(),
        dispatch(uploadId({ uri: shrunkId, name: "id.jpg", type: "image/jpeg" })).unwrap(),
      ]);

      const selfieImageId = selfieRes?._id || selfieRes?.id;
      const idImageId = idRes?._id || idRes?.id;
      if (!selfieImageId || !idImageId) throw new Error("Upload response missing ids");

      const result = await dispatch(
        createVerificationRequest({
          personal: personalData,
          education: educationData,
          selfieImageId,
          idImageId,
          did, // normalized did:polygon:…
        })
      ).unwrap();

      console.log("✅ Verification submit OK:", result);
      Alert.alert("✅ Success", "Verification submitted successfully!");
      router.push("/(main)/settings");
    } catch (err) {
      console.log("💥 Submit flow FAILED:", err?.message || err);
      Alert.alert("Error", String(err?.message || "Submission failed"));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.background} />
      <Text style={styles.title}>Confirm Your Info</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <Text>Full Name: {personalData.fullName || "—"}</Text>
        <Text>Address: {personalData.address || "—"}</Text>
        <Text>Place of Birth: {personalData.birthPlace || "—"}</Text>
        <Text>Date of Birth: {personalData.birthDate || "—"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Education</Text>
        <Text>High School: {educationData.highSchool || "—"}</Text>
        <Text>Admission: {educationData.admissionDate || "—"}</Text>
        <Text>Graduation: {educationData.graduationDate || "—"}</Text>
      </View>

      {selfieUri && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selfie</Text>
          <Image source={{ uri: selfieUri }} style={styles.image} />
        </View>
      )}

      {idUri && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ID</Text>
          <Text>ID Type: {idType || "—"}</Text>
          <Image source={{ uri: idUri }} style={styles.image} />
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, (loading || !did) && { opacity: 0.6 }]}
        onPress={handleSubmit}
        disabled={loading || !did}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: s(20), alignItems: "center", backgroundColor: "#f2f4f9" },
  background: { position: "absolute", top: 0, right: 0, left: 0, bottom: 0, backgroundColor: "#E6F0FF", borderRadius: 50, zIndex: -1 },
  title: { fontSize: s(24), fontWeight: "700", marginBottom: vs(20), textAlign: "center" },
  sectionTitle: { fontSize: s(18), fontWeight: "600", marginBottom: vs(10) },
  card: { backgroundColor: "#fff", padding: s(15), borderRadius: s(12), marginBottom: vs(15), width: "100%", shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 3 },
  image: { width: "100%", height: 200, borderRadius: s(10), marginTop: vs(10), resizeMode: "cover" },
  button: { backgroundColor: "#00B365", paddingVertical: vs(12), paddingHorizontal: s(30), borderRadius: s(10), marginTop: vs(20), width: "90%", alignItems: "center" },
  buttonText: { color: "#fff", fontSize: s(18), fontWeight: "600" },
});
