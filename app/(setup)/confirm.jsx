// app/setup/Confirm.jsx
import React from "react";
import { View, Text, Image, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { s, vs } from "react-native-size-matters";

export default function Confirm() {
  const { personal, education, selfieUri, idUri, idType } = useLocalSearchParams();

  // Parse JSON strings back into objects safely
  const personalData = personal ? JSON.parse(personal) : {};
  const educationData = education ? JSON.parse(education) : {};

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

      {/* Selfie Preview */}
      {selfieUri && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selfie</Text>
          <Image source={{ uri: selfieUri }} style={styles.image} />
        </View>
      )}

      {/* ID Preview */}
      {idUri && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>ID</Text>
          <Text>ID Type: {idType}</Text>
          <Image source={{ uri: idUri }} style={styles.image} />
        </View>
      )}
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
});
