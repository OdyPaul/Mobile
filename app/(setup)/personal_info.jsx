import React, { useRef, useState, forwardRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { s, vs } from "react-native-size-matters";
import { useRouter } from "expo-router";

const PRIMARY_GREEN = "#28a745";
const BG = "#f2f4f9";
const LINE = "#DADDE1";
const LABEL = "#515E6B";
const PLACEHOLDER = "#9AA0A6";

const LabeledLineInput = forwardRef(({ label, style, ...props }, ref) => (
  <View style={{ width: "100%", marginBottom: vs(14) }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      ref={ref}
      style={[styles.lineInput, style]}
      placeholderTextColor={PLACEHOLDER}
      {...props}
    />
  </View>
));

export default function PersonalInfo() {
  const router = useRouter();

  const [personal, setPersonal] = useState({
    fullName: "",
    address: "",
    birthPlace: "",
    birthDate: "",
  });

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");

  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  const refs = {
    middle: useRef(null),
    last: useRef(null),
    address: useRef(null),
    birthPlace: useRef(null),
    year: useRef(null),
    month: useRef(null),
    day: useRef(null),
  };

  const handleNext = () => {
    const full = `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim();
    if (!full || !personal.address || !personal.birthPlace) {
      return Alert.alert("Missing Information", "Please complete all fields.");
    }
    const y = parseInt(birthYear, 10);
    const m = parseInt(birthMonth, 10);
    const d = parseInt(birthDay, 10);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      return Alert.alert("Invalid Date", "Please enter a valid date of birth.");
    }
    const birthDateISO = new Date(
      `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    ).toISOString();

    const updated = { ...personal, fullName: full, birthDate: birthDateISO };

    router.push({
      pathname: "/(setup)/educ_info",
      params: { personal: JSON.stringify(updated) },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        extraScrollHeight={80}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Personal Information</Text>

        <LabeledLineInput
          label="First name"
          placeholder="Ex: Juan"
          value={firstName}
          returnKeyType="next"
          onSubmitEditing={() => refs.middle.current?.focus()}
          onChangeText={(t) => {
            setFirstName(t);
            setPersonal({
              ...personal,
              fullName: `${t} ${middleName} ${lastName}`.replace(/\s+/g, " ").trim(),
            });
          }}
        />
        <LabeledLineInput
          ref={refs.middle}
          label="Middle name"
          placeholder="Optional"
          value={middleName}
          returnKeyType="next"
          onSubmitEditing={() => refs.last.current?.focus()}
          onChangeText={(t) => {
            setMiddleName(t);
            setPersonal({
              ...personal,
              fullName: `${firstName} ${t} ${lastName}`.replace(/\s+/g, " ").trim(),
            });
          }}
        />
        <LabeledLineInput
          ref={refs.last}
          label="Last name"
          placeholder="Ex: Dela Cruz"
          value={lastName}
          returnKeyType="next"
          onSubmitEditing={() => refs.address.current?.focus()}
          onChangeText={(t) => {
            setLastName(t);
            setPersonal({
              ...personal,
              fullName: `${firstName} ${middleName} ${t}`.replace(/\s+/g, " ").trim(),
            });
          }}
        />
        <LabeledLineInput
          ref={refs.address}
          label="Address"
          placeholder="House / Street / City / Province"
          value={personal.address}
          returnKeyType="next"
          onSubmitEditing={() => refs.birthPlace.current?.focus()}
          onChangeText={(t) => setPersonal({ ...personal, address: t })}
        />
        <LabeledLineInput
          ref={refs.birthPlace}
          label="Place of birth"
          placeholder="City / Province / Country"
          value={personal.birthPlace}
          returnKeyType="next"
          onSubmitEditing={() => refs.year.current?.focus()}
          onChangeText={(t) => setPersonal({ ...personal, birthPlace: t })}
        />

        <Text style={[styles.label, { marginTop: vs(6) }]}>Date of birth</Text>
        <View style={styles.dateRow}>
          <TextInput
            ref={refs.year}
            style={[styles.lineInput, styles.dateInput]}
            placeholder="YYYY"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            maxLength={4}
            value={birthYear}
            returnKeyType="next"
            onChangeText={(t) => {
              setBirthYear(t);
              if (t.length === 4) refs.month.current?.focus();
            }}
          />
          <TextInput
            ref={refs.month}
            style={[styles.lineInput, styles.dateInput]}
            placeholder="MM"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            maxLength={2}
            value={birthMonth}
            returnKeyType="next"
            onChangeText={(t) => {
              setBirthMonth(t);
              if (t.length === 2) refs.day.current?.focus();
            }}
          />
          <TextInput
            ref={refs.day}
            style={[styles.lineInput, styles.dateInput]}
            placeholder="DD"
            placeholderTextColor={PLACEHOLDER}
            keyboardType="number-pad"
            maxLength={2}
            value={birthDay}
            onChangeText={setBirthDay}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.btnText}>Next</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: s(20), alignItems: "center" },
  title: { fontSize: s(22), fontWeight: "700", marginBottom: vs(10) },
  label: { fontSize: s(12), fontWeight: "600", color: LABEL, marginBottom: vs(6), alignSelf: "flex-start" },
  lineInput: {
    width: "100%",
    paddingVertical: vs(10),
    fontSize: s(14),
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  dateRow: { flexDirection: "row", width: "100%", gap: s(10), marginBottom: vs(6) },
  dateInput: { flex: 1, textAlign: "center" },
  button: {
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: vs(14),
    borderRadius: s(12),
    alignItems: "center",
    width: "100%",
    marginTop: vs(14),
  },
  btnText: { color: "#fff", fontSize: s(16), fontWeight: "700" },
});
