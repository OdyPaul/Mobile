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
  const { personal, education, selfieUri, idUri, idType, idNumber } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const reduxUser = useSelector((s) => s.auth.user);

  const [did, setDid] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const walletSessionRaw = await AsyncStorage.getItem("walletSession");
        const walletAddr = walletSessionRaw ? JSON.parse(walletSessionRaw)?.address : null;

        const reduxAddr =
          reduxUser?.did ||
          reduxUser?.walletAddress ||
          reduxUser?.user?.did ||
          reduxUser?.user?.walletAddress ||
          null;

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
      } catch {
        if (mounted) setDid(null);
      }
    })();
    return () => { mounted = false; };
  }, [reduxUser]);

  const personalData = safeParse(personal);
  const educationData = safeParse(education);

  const prettyIdType = {
    philsys: "PhilSys (National ID)",
    student_psau: "Student ID (PSAU)",
    passport: "Philippine Passport",
    drivers_license: "Driver’s License",
    sss_umid: "SSS UMID",
    philhealth: "PhilHealth ID",
    tin: "TIN ID",
    postal: "Postal ID",
    voter: "Voter’s ID",
    prc: "PRC ID",
    gsis: "GSIS ID",
  };

  const fmtDate = (iso) => {
    try { return iso ? new Date(iso).toISOString().slice(0, 10) : "—"; } catch { return "—"; }
  };

  const validate = () => {
    if (!did) { Alert.alert("Link wallet", "Please link your wallet before submitting."); return false; }
    if (!personalData?.fullName || !personalData?.address || !personalData?.birthPlace || !personalData?.birthDate) {
      Alert.alert("Missing info", "Personal information is incomplete."); return false;
    }
    if (!educationData?.highSchool || !educationData?.admissionDate || !educationData?.graduationDate) {
      Alert.alert("Missing info", "Education information is incomplete."); return false;
    }
    if (!selfieUri || !idUri) { Alert.alert("Missing images", "Please provide both a selfie and a valid ID."); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (inFlightRef.current) return;
    if (!validate()) return;

    inFlightRef.current = true;
    setLoading(true);
    try {
      const [shrunkSelfie, shrunkId] = await Promise.all([shrink(selfieUri), shrink(idUri)]);
      const [selfieRes, idRes] = await Promise.all([
        dispatch(uploadSelfie({ uri: shrunkSelfie, name: "selfie.jpg", type: "image/jpeg" })).unwrap(),
        dispatch(uploadId({ uri: shrunkId, name: "id.jpg", type: "image/jpeg" })).unwrap(),
      ]);

      const selfieImageId = selfieRes?._id || selfieRes?.id;
      const idImageId = idRes?._id || idRes?.id;
      if (!selfieImageId || !idImageId) throw new Error("Upload response missing ids");

      await dispatch(
        createVerificationRequest({
          personal: personalData,
          education: educationData,
          selfieImageId,
          idImageId,
          did,
          idMeta: { idType, idNumber },
        })
      ).unwrap();

      Alert.alert("✅ Success", "Verification submitted successfully!");
      router.push("/(main)/settings");
    } catch (err) {
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
        <Text style={styles.sectionTitle}>Personal</Text>
        <View style={styles.row}><Text style={styles.key}>Full name</Text><Text style={styles.val}>{personalData.fullName || "—"}</Text></View>
        <View style={styles.row}><Text style={styles.key}>Address</Text><Text style={styles.val}>{personalData.address || "—"}</Text></View>
        <View style={styles.row}><Text style={styles.key}>Birth place</Text><Text style={styles.val}>{personalData.birthPlace || "—"}</Text></View>
        <View style={styles.row}><Text style={styles.key}>Birth date</Text><Text style={styles.val}>{fmtDate(personalData.birthDate)}</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Education</Text>
        <View style={styles.row}><Text style={styles.key}>High School</Text><Text style={styles.val}>{educationData.highSchool || "—"}</Text></View>
        <View style={styles.row}><Text style={styles.key}>Admission to PSAU</Text><Text style={styles.val}>{educationData.admissionDate || "—"}</Text></View>
        <View style={styles.row}><Text style={styles.key}>Graduation</Text><Text style={styles.val}>{educationData.graduationDate || "—"}</Text></View>
      </View>

      {selfieUri ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selfie</Text>
          <Image source={{ uri: String(selfieUri) }} style={styles.image} />
        </View>
      ) : null}

      {idUri ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Valid ID</Text>
          <View style={styles.row}><Text style={styles.key}>Type</Text><Text style={styles.val}>{prettyIdType[String(idType)] || String(idType) || "—"}</Text></View>
          {idNumber ? <View style={styles.row}><Text style={styles.key}>ID Number</Text><Text style={styles.val}>{String(idNumber)}</Text></View> : null}
          <Image source={{ uri: String(idUri) }} style={styles.image} />
        </View>
      ) : null}

      <TouchableOpacity style={[styles.button, (loading || !did) && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading || !did}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: s(20), alignItems: "center", backgroundColor: "#f2f4f9" },
  background: { position: "absolute", top: 0, right: 0, left: 0, bottom: 0, backgroundColor: "#E6F0FF", borderRadius: 50, zIndex: -1 },
  title: { fontSize: s(24), fontWeight: "700", marginBottom: vs(16), textAlign: "center" },
  sectionTitle: { fontSize: s(16), fontWeight: "700", marginBottom: vs(10) },
  card: { backgroundColor: "#fff", padding: s(15), borderRadius: s(12), marginBottom: vs(14), width: "100%", shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: s(10), marginBottom: vs(6) },
  key: { color: "#6b7280", fontWeight: "600", width: "45%" },
  val: { color: "#111827", flex: 1, textAlign: "right" },
  image: { width: "100%", height: 200, borderRadius: s(10), marginTop: vs(10), resizeMode: "cover" },
  button: { backgroundColor: "#00B365", paddingVertical: vs(12), borderRadius: s(10), marginTop: vs(16), width: "90%", alignItems: "center" },
  buttonText: { color: "#fff", fontSize: s(18), fontWeight: "700" },
});
