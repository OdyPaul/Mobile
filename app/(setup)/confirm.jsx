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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Wallet } from "ethers";
import { s, vs } from "react-native-size-matters";
import { createVerificationRequest } from "../../features/verification/verificationSlice";
import { uploadSelfie, uploadId } from "../../features/photo/photoSlice";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Confirm() {
  const { personal, education, selfieUri, idUri, idType } = useLocalSearchParams();
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(false);

  // Parse JSON strings safely
  const personalData = personal ? JSON.parse(personal) : {};
  const educationData = education ? JSON.parse(education) : {};

  // -----------------------------
  //  Submit Handler
  // -----------------------------
  const handleSubmit = async () => {
    try {
      setLoading(true);

      // 1️⃣ Get token and current user
      const token = await AsyncStorage.getItem("token");
      const config = {
        headers: {
          Authorization: `Bearer ${token ? JSON.parse(token) : ""}`,
          "Content-Type": "application/json",
        },
      };

      // 2️⃣ If DID is missing, create one first
      if (!user?.did) {
        try {
          // Use user.email as mnemonic seed (testing only)
          const mnemonic = Wallet.createRandom().mnemonic?.phrase || user.email;
          const wallet = Wallet.fromPhrase
            ? Wallet.fromPhrase(mnemonic)
            : Wallet.fromMnemonic(mnemonic);
          const did = wallet.address;

          // PUT request to backend to update DID
          const res = await axios.put(
            `${API_URL}/api/mobile/${user._id}/did`,
            { walletAddress: did },
            config
          );
          console.log("✅ DID linked:", res.data);
        } catch (err) {
          console.error("❌ Error linking DID:", err);
          Alert.alert("Error", "Failed to link wallet/DID.");
          setLoading(false);
          return; // cancel submit
        }
      }

      // 3️⃣ Upload Selfie
      let selfieRes;
      if (selfieUri) {
        selfieRes = await dispatch(
          uploadSelfie({
            uri: selfieUri,
            name: "selfie.jpg",
            type: "image/jpeg",
          })
        ).unwrap();
      }

      // 4️⃣ Upload ID
      let idRes;
      if (idUri) {
        idRes = await dispatch(
          uploadId({
            uri: idUri,
            name: "id.jpg",
            type: "image/jpeg",
          })
        ).unwrap();
      }

      // 5️⃣ Submit verification request
      await dispatch(
        createVerificationRequest({
          personal,
          education,
          selfieImageId: selfieRes?.id || selfieRes?._id || null,
          idImageId: idRes?.id || idRes?._id || null,
        })
      ).unwrap();

      Alert.alert("✅ Success", "Verification submitted successfully!");
      router.push("/(tabs)/settings");
    } catch (err) {
      console.error("❌ Submission failed:", err);
      Alert.alert("Error", "Submission failed, please try again.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  //  Render
  // -----------------------------
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.background} />
      <Text style={styles.title}>Confirm Your Info</Text>

      {/* Personal Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Info</Text>
        <Text>Full Name: {personalData.fullName}</Text>
        <Text>Address: {personalData.address}</Text>
        <Text>Place of Birth: {personalData.birthPlace}</Text>
        <Text>Date of Birth: {personalData.birthDate}</Text>
      </View>

      {/* Education Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Education</Text>
        <Text>High School: {educationData.highSchool}</Text>
        <Text>Admission: {educationData.admissionDate}</Text>
        <Text>Graduation: {educationData.graduationDate}</Text>
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
          <Text>ID Type: {idType}</Text>
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
