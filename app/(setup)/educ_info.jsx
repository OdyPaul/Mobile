import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { s, vs } from "react-native-size-matters";
import { useRouter, useLocalSearchParams } from "expo-router";

const PRIMARY_GREEN = "#28a745";

export default function EducationInfo() {
  const router = useRouter();
  const { personal } = useLocalSearchParams();
  const personalData = personal ? JSON.parse(personal) : {};

  const [education, setEducation] = useState({
    highSchool: "",
    admissionDate: "",
    graduationDate: "",
  });

  const handleNext = () => {
    router.push({
      pathname: "/(setup)/selfie",
      params: {
        personal: JSON.stringify(personalData),
        education: JSON.stringify(education),
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Education Information</Text>

      <TextInput
        style={styles.input}
        placeholder="High School"
        value={education.highSchool}
        onChangeText={(t) => setEducation({ ...education, highSchool: t })}
      />
      <TextInput
        style={styles.input}
        placeholder="Date of Admission (ex. 2021-2022)"
        value={education.admissionDate}
        onChangeText={(t) => setEducation({ ...education, admissionDate: t })}
      />
      <TextInput
        style={styles.input}
        placeholder="Date Graduated (ex. 2025)"
        value={education.graduationDate}
        onChangeText={(t) => setEducation({ ...education, graduationDate: t })}
      />

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.btnText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: s(20), backgroundColor: "#f2f4f9" },
  title: { fontSize: s(20), fontWeight: "700", marginBottom: vs(20) },
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: s(10), padding: s(12), marginBottom: vs(15) },
  button: { backgroundColor: PRIMARY_GREEN, padding: vs(14), borderRadius: s(12), alignItems: "center", width: "100%" },
  btnText: { color: "#fff", fontSize: s(16), fontWeight: "600" },
});
