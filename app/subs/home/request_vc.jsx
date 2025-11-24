// app/.../RequestVC.jsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useDispatch, useSelector } from "react-redux";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { s, vs } from "react-native-size-matters";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createVcRequest } from "../../../features/vc/vcRequestSlice";
import { addLocalNotification } from "../../../features/notif/notifSlice";
import FaceVerifier from "../../../lib/faceVerifier";

const PRIMARY = "#16A34A";
const BG = "#f2f4f9";
const LINE = "#DADDE1";
const LABEL = "#515E6B";
const PLACEHOLDER = "#9AA0A6";

const PURPOSE_OPTIONS = [
  { value: "employment", label: "Employment" },
  { value: "further studies", label: "Further Studies" },
  {
    value: "board examination / professional licensure",
    label: "Board Examination / Professional Licensure",
  },
  {
    value: "scholarship / grant application",
    label: "Scholarship / Grant Application",
  },
  { value: "personal / general reference", label: "Personal / General Reference" },
  { value: "overseas employment", label: "Overseas Employment" },
  { value: "training / seminar", label: "Training / Seminar" },
];

export default function RequestVC() {
  const dispatch = useDispatch();
  const router = useRouter();

  const user = useSelector((s) => s?.auth?.user);
  const isVerified = String(user?.verified || "").toLowerCase() === "verified";
  const isCreating = useSelector((s) => s?.vcRequest?.isCreating);

  const [type, setType] = useState("TOR");
  const [purpose, setPurpose] = useState(""); // store the VALUE
  const [showPurposeMenu, setShowPurposeMenu] = useState(false);

  // anchor now toggle
  const [anchorNow, setAnchorNow] = useState(false);

  // liveness flow
  const [showLiveness, setShowLiveness] = useState(false);

  const selectedPurposeLabel =
    PURPOSE_OPTIONS.find((p) => p.value === purpose)?.label || purpose;

  const validate = () => {
    if (!isVerified) {
      Alert.alert(
        "Not Verified",
        "Your account must be verified before requesting credentials."
      );
      return false;
    }
    if (!purpose.trim()) {
      Alert.alert("Missing Info", "Purpose is required.");
      return false;
    }
    return true;
  };

  const handlePressSubmit = () => {
    if (!validate()) return;
    setShowLiveness(true);
  };

  const handleLivenessPassed = async () => {
    setShowLiveness(false);
    try {
      const res = await dispatch(
        createVcRequest({ type, purpose, anchorNow })
      ).unwrap();

      let msg = "Your credential request was submitted.";
      if (res?.paymentTxNo) {
        msg += `\n\nPayment reference (TX no):\n${res.paymentTxNo}`;
      } else {
        msg +=
          "\n\nYou may proceed to the cashier/payment section using your student details.";
      }

      const notifDesc = res?.paymentTxNo
        ? `Payment reference (TX no): ${res.paymentTxNo}`
        : "VC request submitted. Proceed to cashier/payment.";

      dispatch(
        addLocalNotification({
          type: "vc_request",
          title: `${type} request submitted`,
          desc: notifDesc,
          status: "pending",
          icon: "document-text-outline",
          meta: {
            type,
            purpose,
            paymentTxNo: res?.paymentTxNo || null,
          },
        })
      );

      Alert.alert("Success", msg);

      setPurpose("");
      setShowPurposeMenu(false);
      setAnchorNow(false);
    } catch (e) {
      Alert.alert("Submit failed", String(e || "Unknown error"));
    }
  };

  const handleLivenessClose = () => {
    setShowLiveness(false);
  };

  if (showLiveness) {
    return (
      <FaceVerifier
        onClose={handleLivenessClose}
        onPassed={handleLivenessPassed}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.container}
        extraScrollHeight={80}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back to Home (upper left) */}
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={20} color="#111827" />
            <Text style={styles.backText}>Back to Home</Text>
          </Pressable>
        </View>

        {/* Header title */}
        <Text style={styles.title}>Request Credential</Text>

        {/* Account status card */}
        <View style={styles.statusCard}>
          <Ionicons
            name={isVerified ? "checkmark-circle" : "alert-circle"}
            size={22}
            color={isVerified ? "#16A34A" : "#DC2626"}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusLabel}>Account status</Text>
            <Text
              style={[
                styles.statusValue,
                { color: isVerified ? "#16A34A" : "#DC2626" },
              ]}
            >
              {isVerified ? "Verified" : "Not verified"}
            </Text>
            <Text style={styles.statusHint}>
              A quick liveness check will run before your request is sent.
            </Text>
          </View>
        </View>

        {/* Type picker */}
        <Text style={styles.label}>Type of VC</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={type}
            onValueChange={(v) => setType(v)}
            style={styles.picker}
            dropdownIconColor="#000000ff"   // icon white
          >
            <Picker.Item
              label="Transcript of Records (TOR)"
              value="TOR"
              color="#ffffff"              // item text white
            />
            <Picker.Item
              label="Diploma"
              value="DIPLOMA"
              color="#ffffff"              // item text white
            />
          </Picker>
        </View>

        {/* Purpose input + dropdown */}
        <Text style={[styles.label, { marginTop: vs(12) }]}>Purpose</Text>
        <View style={styles.purposeRow}>
          <TextInput
            style={[styles.lineInput, { flex: 1 }]}
            placeholder="Type a purpose or pick from options"
            placeholderTextColor={PLACEHOLDER}
            value={selectedPurposeLabel}
            onChangeText={(txt) => setPurpose(txt.trim().toLowerCase())}
          />
          <Pressable
            onPress={() => setShowPurposeMenu((v) => !v)}
            style={styles.iconBtn}
            hitSlop={10}
          >
            <Ionicons name="options-outline" size={18} color="#111827" />
          </Pressable>
        </View>

        {showPurposeMenu && (
          <View style={styles.dropdownCard}>
            {PURPOSE_OPTIONS.map((opt, idx) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.dropdownItem,
                  idx === PURPOSE_OPTIONS.length - 1 && {
                    borderBottomWidth: 0,
                  },
                ]}
                onPress={() => {
                  setPurpose(opt.value);
                  setShowPurposeMenu(false);
                }}
              >
                <Ionicons name="chevron-forward" size={16} color="#6b7280" />
                <Text style={styles.dropdownText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Anchor now toggle */}
        <View style={styles.anchorRow}>
          <Pressable
            onPress={() => setAnchorNow((v) => !v)}
            style={styles.anchorPressable}
            hitSlop={10}
          >
            <Ionicons
              name={anchorNow ? "checkbox-outline" : "square-outline"}
              size={20}
              color={anchorNow ? PRIMARY : "#6b7280"}
              style={{ marginRight: s(10) }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.anchorLabel}>Anchor now</Text>
              <Text style={styles.anchorHint}>
                When enabled, your request will create a draft that is marked
                for blockchain anchoring once payment is completed.
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.button,
            (isCreating || !isVerified) && { opacity: 0.6 },
          ]}
          onPress={handlePressSubmit}
          disabled={isCreating || !isVerified}
        >
          <Text style={styles.btnText}>
            {isCreating ? "Submitting…" : "Submit Request"}
          </Text>
        </TouchableOpacity>

        {!isVerified && (
          <Text style={styles.lockHint}>
            You need a verified account before you can request credentials.
          </Text>
        )}
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: s(20) },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(8),
    marginTop: vs(25),
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  backText: {
    marginLeft: s(4),
    fontSize: s(12),
    color: "#111827",
    fontWeight: "500",
  },

  title: {
    fontSize: s(22),
    fontWeight: "700",
    marginBottom: vs(14),
    marginTop: vs(10),
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: s(12),
    borderRadius: s(12),
    backgroundColor: "#E5F3FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginBottom: vs(18),
  },
  statusLabel: {
    fontSize: s(11),
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#475569",
  },
  statusValue: { fontSize: s(14), fontWeight: "700", marginTop: 2 },
  statusHint: {
    fontSize: s(11),
    color: "#64748B",
    marginTop: 4,
  },

  label: {
    fontSize: s(12),
    fontWeight: "600",
    color: LABEL,
    marginBottom: vs(6),
  },

  pickerWrap: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: s(10),
    backgroundColor: "#ffffffff", // 🔥 dark background so white text pops
    marginBottom: vs(8),
    overflow: "hidden",
  },
  picker: {
    height: vs(55),
    width: "100%",
    color: "#000000ff", // 🔥 makes picker text white
  },

  lineInput: {
    paddingVertical: vs(10),
    fontSize: s(14),
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    color: "#111827",
  },
  purposeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
  },
  iconBtn: {
    padding: s(8),
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  dropdownCard: {
    marginTop: vs(8),
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: s(10),
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: s(8),
    paddingVertical: vs(10),
    paddingHorizontal: s(12),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownText: { fontSize: s(14), color: "#111827", flexShrink: 1 },

  anchorRow: {
    marginTop: vs(16),
  },
  anchorPressable: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: vs(6),
  },
  anchorLabel: {
    fontSize: s(13),
    fontWeight: "600",
    color: "#111827",
  },
  anchorHint: {
    fontSize: s(11),
    color: "#6B7280",
    marginTop: 2,
  },

  button: {
    backgroundColor: PRIMARY,
    paddingVertical: vs(14),
    borderRadius: s(12),
    alignItems: "center",
    width: "100%",
    marginTop: vs(24),
  },
  btnText: { color: "#fff", fontSize: s(16), fontWeight: "700" },

  lockHint: {
    marginTop: vs(8),
    fontSize: s(11),
    color: "#9CA3AF",
  },
});
