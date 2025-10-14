// app/setup/Confirm.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  LogBox,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { s, vs } from "react-native-size-matters";
import { createVerificationRequest } from "../../features/verification/verificationSlice";
import { uploadSelfie, uploadId } from "../../features/photo/photoSlice";

export default function Confirm() {
  const { personal, education, selfieUri, idUri, idType } = useLocalSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);

  LogBox.ignoreLogs([
    "InternalBytecode.js",
    "ENOENT: no such file or directory",
  ]);

  // ------------------------------------------------
  // ✅ Safe JSON Parsing
  // ------------------------------------------------
  const safeParse = (data) => {
    try {
      if (typeof data === "object") return data;
      if (typeof data === "string") {
        if (data.trim().startsWith("{") || data.trim().startsWith("[")) {
          return JSON.parse(data);
        } else {
          console.warn("⚠️ Not JSON, returning raw string:", data);
          return {};
        }
      }
      return {};
    } catch (error) {
      console.error("❌ JSON parse failed:", error.message, data);
      return {};
    }
  };

  const personalData = safeParse(personal);
  const educationData = safeParse(education);

  // ------------------------------------------------
  // ✅ Submit Handler (NO did generation/linking)
  // ------------------------------------------------
  const handleSubmit = async () => {
    try {
      setLoading(true);

      const token = await AsyncStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token || ""}` },
      };

      // Upload selfie
      let selfieRes = null;
      if (selfieUri) {
        selfieRes = await dispatch(
          uploadSelfie({
            uri: selfieUri,
            name: "selfie.jpg",
            type: "image/jpeg",
          })
        ).unwrap();
      }

      // Upload ID
      let idRes = null;
      if (idUri) {
        idRes = await dispatch(
          uploadId({
            uri: idUri,
            name: "id.jpg",
            type: "image/jpeg",
          })
        ).unwrap();
      }
      console.log('POST verification payload:', {
      personal: personalData,
      education: educationData,
      selfieImageId: selfieRes?.id || selfieRes?._id || null,
      idImageId: idRes?.id || idRes?._id || null,
      did: user?.did || null,
    });

      // Create Verification Request
      await dispatch(
        createVerificationRequest({
          personal: personalData,
          education: educationData,
          selfieImageId: selfieRes?.id || selfieRes?._id || null,
          idImageId: idRes?.id || idRes?._id || null,
          // 👇 NO auto-generated DID; send user's DID if it exists, else null
          did: user?.did || null,
        })
      ).unwrap();

      Alert.alert("✅ Success", "Verification submitted successfully!");
      router.push("/(main)/settings");
    } catch (err) {
      console.error("❌ Submission failed:", err);
      Alert.alert("Error", "Something went wrong during submission.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------
  // ✅ UI Rendering
  // ------------------------------------------------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.background} />
      <Text style={styles.title}>Confirm Your Info</Text>

      {/* Personal Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <Text>Full Name: {personalData.fullName || "—"}</Text>
        <Text>Address: {personalData.address || "—"}</Text>
        <Text>Place of Birth: {personalData.birthPlace || "—"}</Text>
        <Text>Date of Birth: {personalData.birthDate || "—"}</Text>
      </View>

      {/* Education Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Education</Text>
        <Text>High School: {educationData.highSchool || "—"}</Text>
        <Text>Admission: {educationData.admissionDate || "—"}</Text>
        <Text>Graduation: {educationData.graduationDate || "—"}</Text>
      </View>

      {/* Selfie */}
      {selfieUri && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selfie</Text>
          <Image source={{ uri: selfieUri }} style={styles.image} />
        </View>
      )}

      {/* ID */}
      {idUri && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ID</Text>
          <Text>ID Type: {idType || "—"}</Text>
          <Image source={{ uri: idUri }} style={styles.image} />
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.7 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ------------------------------------------------
// ✅ Styles
// ------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: s(20),
    alignItems: "center",
    backgroundColor: "#f2f4f9",
  },
  background: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#E6F0FF",
    borderRadius: 50,
    zIndex: -1,
  },
  title: {
    fontSize: s(24),
    fontWeight: "700",
    marginBottom: vs(20),
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: s(18),
    fontWeight: "600",
    marginBottom: vs(10),
  },
  card: {
    backgroundColor: "#fff",
    padding: s(15),
    borderRadius: s(12),
    marginBottom: vs(15),
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: s(10),
    marginTop: vs(10),
    resizeMode: "cover",
  },
  button: {
    backgroundColor: "#00B365",
    paddingVertical: vs(12),
    paddingHorizontal: s(30),
    borderRadius: s(10),
    marginTop: vs(20),
    width: "90%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: s(18),
    fontWeight: "600",
  },
});
