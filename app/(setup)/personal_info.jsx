import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
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

  // Split full name parts
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  // Separate state for date components
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  // Refs for auto focus
  const monthRef = useRef(null);
  const dayRef = useRef(null);

  const handleNext = () => {
    const combinedFullName = `${firstName} ${middleName} ${lastName}`.trim();
    const updatedPersonal = { ...personal, fullName: combinedFullName };

    if (!combinedFullName || !updatedPersonal.address || !updatedPersonal.birthPlace) {
      return Alert.alert("Missing Information", "Please complete all fields.");
    }

    // Validate date
    const y = parseInt(birthYear);
    const m = parseInt(birthMonth);
    const d = parseInt(birthDay);

    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      return Alert.alert("Invalid Date", "Please enter a valid date of birth.");
    }

    const birthDateISO = new Date(`${y}-${m}-${d}`).toISOString();
    const fullPersonal = { ...updatedPersonal, birthDate: birthDateISO };

    router.push({
      pathname: "/(setup)/educ_info",
      params: { personal: JSON.stringify(fullPersonal) },
    });
  };

  const handleYearChange = (text) => {
    setBirthYear(text);
    if (text.length === 4) monthRef.current?.focus();
  };

  const handleMonthChange = (text) => {
    setBirthMonth(text);
    if (text.length === 2) dayRef.current?.focus();
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Personal Information</Text>

      {/* Full Name Split */}
      <Text style={styles.label}>Full Name</Text>
      <View style={styles.nameRow}>
        <TextInput
          style={[styles.input, styles.nameInput]}
          placeholder="First Name"
          placeholderTextColor="black"
          value={firstName}
          onChangeText={(t) => {
            setFirstName(t);
            setPersonal({ ...personal, fullName: `${t} ${middleName} ${lastName}`.trim() });
          }}
        />
        <TextInput
          style={[styles.input, styles.nameInput]}
          placeholder="Middle Name"
          placeholderTextColor="black"
          value={middleName}
          onChangeText={(t) => {
            setMiddleName(t);
            setPersonal({ ...personal, fullName: `${firstName} ${t} ${lastName}`.trim() });
          }}
        />
        <TextInput
          style={[styles.input, styles.nameInput]}
          placeholder="Last Name"
          placeholderTextColor="black"
          value={lastName}
          onChangeText={(t) => {
            setLastName(t);
            setPersonal({ ...personal, fullName: `${firstName} ${middleName} ${t}`.trim() });
          }}
        />
      </View>

      {/* Address */}
      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your address"
        placeholderTextColor="black"
        value={personal.address}
        onChangeText={(t) => setPersonal({ ...personal, address: t })}
      />

      {/* Birthplace */}
      <Text style={styles.label}>Place of Birth</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your place of birth"
        placeholderTextColor="black"
        value={personal.birthPlace}
        onChangeText={(t) => setPersonal({ ...personal, birthPlace: t })}
      />

      {/* Date of Birth */}
      <Text style={styles.label}>Date of Birth</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, styles.dateInput]}
          placeholder="YYYY"
          placeholderTextColor="black"
          keyboardType="numeric"
          maxLength={4}
          value={birthYear}
          onChangeText={handleYearChange}
          returnKeyType="next"
        />
        <TextInput
          ref={monthRef}
          style={[styles.input, styles.dateInput]}
          placeholder="MM"
          placeholderTextColor="black"
          keyboardType="numeric"
          maxLength={2}
          value={birthMonth}
          onChangeText={handleMonthChange}
          returnKeyType="next"
        />
        <TextInput
          ref={dayRef}
          style={[styles.input, styles.dateInput]}
          placeholder="DD"
          placeholderTextColor="black"
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
  title: {
    fontSize: s(20),
    fontWeight: "700",
    marginBottom: vs(20),
  },
  label: {
    fontSize: s(14),
    fontWeight: "600",
    alignSelf: "flex-start",
    marginBottom: vs(8),
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: s(10),
    padding: s(12),
    marginBottom: vs(15),
    backgroundColor: "#fff",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  nameInput: {
    flex: 1,
    marginHorizontal: s(3),
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
  btnText: {
    color: "#fff",
    fontSize: s(16),
    fontWeight: "600",
  },
});
