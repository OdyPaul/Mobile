import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import { s, vs } from "react-native-size-matters";
import { useRouter } from "expo-router";

const PRIMARY_GREEN = "#28a745";

export default function PersonalInfo() {
  const router = useRouter();

  const [personal, setPersonal] = useState({
    fullName: "",
    address: "",
    birthPlace: "",
    birthDate: "", // final ISO string version
  });

  // Separate state for date components
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  const handleNext = () => {
    // Validate the fields first
    if (!personal.fullName || !personal.address || !personal.birthPlace) {
      return Alert.alert("Missing Information", "Please complete all fields.");
    }

    // Check if date parts are valid numbers
    const y = parseInt(birthYear);
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);

    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      return Alert.alert("Invalid Date", "Please enter a valid date of birth.");
    }

    // Create a proper ISO date string
    const birthDateISO = new Date(`${y}-${m}-${d}`).toISOString();

    const fullPersonal = {
      ...personal,
      birthDate: birthDateISO,
    };

    router.push({
      pathname: "/(setup)/educ_info",
      params: { personal: JSON.stringify(fullPersonal) },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Personal Information</Text>

      <TextInput
        style={styles.input}
        placeholder="Full Name"
        value={personal.fullName}
        
        onChangeText={(t) => setPersonal({ ...personal, fullName: t })}
      />
      <TextInput
        style={styles.input}
        placeholder="Address"
        value={personal.address}
        onChangeText={(t) => setPersonal({ ...personal, address: t })}
      />
      <TextInput
        style={styles.input}
        placeholder="Place of Birth"
        value={personal.birthPlace}
        onChangeText={(t) => setPersonal({ ...personal, birthPlace: t })}
      />

      <Text style={styles.label}>Date of Birth</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, styles.dateInput]}
          placeholder="YYYY"
          keyboardType="numeric"
          maxLength={4}
          value={birthYear}
          onChangeText={setBirthYear}
        />
        <TextInput
          style={[styles.input, styles.dateInput]}
          placeholder="MM"
          keyboardType="numeric"
          maxLength={2}
          value={birthMonth}
          onChangeText={setBirthMonth}
        />
        <TextInput
          style={[styles.input, styles.dateInput]}
          placeholder="DD"
          keyboardType="numeric"
          maxLength={2}
          value={birthDay}
          onChangeText={setBirthDay}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleNext}>
        <Text style={styles.btnText}>Next</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: s(20),
    backgroundColor: "#f2f4f9",
  },
  title: { fontSize: s(20), fontWeight: "700", marginBottom: vs(20) },
  label: { fontSize: s(14), fontWeight: "600", alignSelf: "flex-start", marginBottom: vs(8) },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: s(10),
    padding: s(12),
    marginBottom: vs(15),
    backgroundColor: "#fff",
    
    
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: vs(20),
  },
  dateInput: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: s(4),
  },
  button: {
    backgroundColor: PRIMARY_GREEN,
    padding: vs(14),
    borderRadius: s(12),
    alignItems: "center",
    width: "100%",
  },
  btnText: { color: "#fff", fontSize: s(16), fontWeight: "600" },
});
