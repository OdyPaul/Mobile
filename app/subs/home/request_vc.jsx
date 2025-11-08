import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet, Alert } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useDispatch, useSelector } from "react-redux";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { s, vs } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { createVcRequest } from "../../../features/vc/vcRequestSlice";

const PRIMARY = "#16A34A";
const BG = "#f2f4f9";
const LINE = "#DADDE1";
const LABEL = "#515E6B";
const PLACEHOLDER = "#9AA0A6";

const PURPOSE_OPTIONS = [
  { value: "employment", label: "Employment" },
  { value: "further studies", label: "Further Studies" },
  { value: "board examination / professional licensure", label: "Board Examination / Professional Licensure" },
  { value: "scholarship / grant application", label: "Scholarship / Grant Application" },
  { value: "personal / general reference", label: "Personal / General Reference" },
  { value: "overseas employment", label: "Overseas Employment" },
  { value: "training / seminar", label: "Training / Seminar" },
];

export default function RequestVC() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s?.auth?.user);
  const isVerified = String(user?.verified || "").toLowerCase() === "verified";
  const isCreating = useSelector((s) => s?.vcRequest?.isCreating);

  const [type, setType] = useState("TOR");
  const [purpose, setPurpose] = useState(""); // store the VALUE
  const [showPurposeMenu, setShowPurposeMenu] = useState(false);

  const selectedPurposeLabel =
    PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label || purpose; // show pretty label

  const onSubmit = async () => {
    if (!isVerified) return Alert.alert("Not Verified", "Your account is not verified yet.");
    if (!purpose.trim()) return Alert.alert("Missing Info", "Purpose is required.");

    try {
      await dispatch(createVcRequest({ type, purpose })).unwrap();
      Alert.alert("Success", "Your credential request was submitted.");
      setPurpose("");
      setShowPurposeMenu(false);
    } catch (e) {
      Alert.alert("Submit failed", String(e || "Unknown error"));
    }
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
        <Text style={styles.title}>Request Credential</Text>

        <Text style={styles.label}>Type of VC</Text>
        <View style={styles.pickerWrap}>
          <Picker selectedValue={type} onValueChange={(v) => setType(v)}>
            <Picker.Item label="Transcript of Records (TOR)" value="TOR" />
            <Picker.Item label="Diploma" value="DIPLOMA" />
          </Picker>
        </View>

        <Text style={[styles.label, { marginTop: vs(12) }]}>Purpose</Text>
        <View style={styles.purposeRow}>
          <TextInput
            style={[styles.lineInput, { flex: 1 }]}
            placeholder="Type a purpose or pick from options"
            placeholderTextColor={PLACEHOLDER}
            value={selectedPurposeLabel}
            onChangeText={(txt) => setPurpose(txt.trim().toLowerCase())} // free-typed will still be validated server-side
          />
          <Pressable onPress={() => setShowPurposeMenu((v) => !v)} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="settings-outline" size={20} color="#111827" />
          </Pressable>
        </View>

        {showPurposeMenu && (
          <View style={styles.dropdownCard}>
            {PURPOSE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.dropdownItem}
                onPress={() => {
                  setPurpose(opt.value); // ✅ store VALUE
                  setShowPurposeMenu(false);
                }}
              >
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                <Text style={styles.dropdownText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.button, isCreating ? { opacity: 0.6 } : null]} onPress={onSubmit} disabled={isCreating}>
          <Text style={styles.btnText}>{isCreating ? "Submitting…" : "Submit Request"}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: s(20) },
  title: { fontSize: s(22), fontWeight: "700", marginBottom: vs(10) },
  label: { fontSize: s(12), fontWeight: "600", color: LABEL, marginBottom: vs(6) },
  lineInput: { paddingVertical: vs(10), fontSize: s(14), backgroundColor: "transparent", borderBottomWidth: 1, borderBottomColor: LINE },
  pickerWrap: { borderWidth: 1, borderColor: LINE, borderRadius: s(10), backgroundColor: "#fff", marginBottom: vs(8) },
  purposeRow: { flexDirection: "row", alignItems: "center", gap: s(8) },
  iconBtn: { padding: s(8), borderRadius: 999, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  dropdownCard: { marginTop: vs(8), borderWidth: 1, borderColor: LINE, borderRadius: s(10), backgroundColor: "#fff", overflow: "hidden" },
  dropdownItem: { flexDirection: "row", alignItems: "center", gap: s(8), paddingVertical: vs(10), paddingHorizontal: s(12), borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  dropdownText: { fontSize: s(14), color: "#111827", flexShrink: 1 },
  button: { backgroundColor: PRIMARY, paddingVertical: vs(14), borderRadius: s(12), alignItems: "center", width: "100%", marginTop: vs(18) },
  btnText: { color: "#fff", fontSize: s(16), fontWeight: "700" },
});
