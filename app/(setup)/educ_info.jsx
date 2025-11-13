import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { s, vs } from "react-native-size-matters";
import { useRouter, useLocalSearchParams } from "expo-router";

const PRIMARY_GREEN = "#28a745";
const BG = "#f2f4f9";
const LINE = "#DADDE1";
const LABEL = "#515E6B";
const PLACEHOLDER = "#9AA0A6";

export default function EducationInfo() {
  const router = useRouter();
  const { personal } = useLocalSearchParams();
  const personalData = personal ? JSON.parse(String(personal)) : {};

  const [education, setEducation] = useState({
    highSchool: "",
    admissionDate: "",
    graduationDate: "",
  });

  const goNext = () =>
    router.push({
      pathname: "/(setup)/selfie",
      params: { personal: JSON.stringify(personalData), education: JSON.stringify(education) },
    });

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        extraScrollHeight={80}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Education Information</Text>

        <View style={styles.field}>
          <Text style={styles.label}>High School</Text>
          <TextInput
            style={styles.lineInput}
            placeholder="ex. Pampanga National High School"
            placeholderTextColor={PLACEHOLDER}
            value={education.highSchool}
            onChangeText={(t) => setEducation({ ...education, highSchool: t })}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Admission to PSAU</Text>
          <TextInput
            style={styles.lineInput}
            placeholder="ex. 2021–2022 (or YYYY-MM-DD)"
            placeholderTextColor={PLACEHOLDER}
            value={education.admissionDate}
            onChangeText={(t) => setEducation({ ...education, admissionDate: t })}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Graduation date</Text>
          <TextInput
            style={styles.lineInput}
            placeholder="ex. 2025 (or YYYY-MM-DD)"
            placeholderTextColor={PLACEHOLDER}
            value={education.graduationDate}
            onChangeText={(t) => setEducation({ ...education, graduationDate: t })}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={goNext}>
          <Text style={styles.btnText}>Next</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: s(20), alignItems: "center" },
  title: { fontSize: s(22), fontWeight: "700", marginBottom: vs(10),marginTop: vs(30) },
  field: { width: "100%", marginBottom: vs(14) },
  label: { fontSize: s(12), fontWeight: "600", color: LABEL, marginBottom: vs(6), alignSelf: "flex-start" },
  lineInput: {
    width: "100%",
    paddingVertical: vs(10),
    fontSize: s(14),
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  button: { backgroundColor: PRIMARY_GREEN, paddingVertical: vs(14), borderRadius: s(12), alignItems: "center", width: "100%", marginTop: vs(14) },
  btnText: { color: "#fff", fontSize: s(16), fontWeight: "700" },
});
