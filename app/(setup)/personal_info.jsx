// app/(setup)/personal_info.jsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { s, vs } from "react-native-size-matters";
import { useRouter } from "expo-router";

const PRIMARY_GREEN = "#28a745";

export default function PersonalInfo() {
  const router = useRouter();

  const [personal, setPersonal] = useState({
    fullName: "",
    address: "",
    birthPlace: "",
    birthDate: "",
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.background} />
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
      <TextInput
        style={styles.input}
        placeholder="Date of Birth (YYYY-MM-DD)"
        value={personal.birthDate}
        onChangeText={(t) => setPersonal({ ...personal, birthDate: t })}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push({
          pathname: "educ_info",
          params: { personal } // use params instead of state for simplicity
        })}
      >
        <Text style={styles.btnText}>Next</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: s(20), backgroundColor: "#f2f4f9" },
  background: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#E6F0FF", borderRadius: 50, zIndex: -1 },
  title: { fontSize: s(20), fontWeight: "700", marginBottom: vs(20) },
  input: { width: "100%", borderWidth: 1, borderColor: "#ccc", borderRadius: s(10), padding: s(12), marginBottom: vs(15) },
  button: { backgroundColor: PRIMARY_GREEN, padding: vs(14), borderRadius: s(12), alignItems: "center", width: "100%" },
  btnText: { color: "#fff", fontSize: s(16), fontWeight: "600" },
});
