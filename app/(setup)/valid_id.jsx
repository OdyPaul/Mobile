import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, TextInput } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Picker } from "@react-native-picker/picker";
import { s, vs } from "react-native-size-matters";

const PRIMARY_GREEN = "#28a745";
const BG = "#f2f4f9";
const LINE = "#DADDE1";
const LABEL = "#515E6B";
const PLACEHOLDER = "#9AA0A6";

export default function ValidId() {
  const router = useRouter();
  const { personal, education, selfieUri } = useLocalSearchParams();
  const personalData = personal ? JSON.parse(String(personal)) : {};
  const educationData = education ? JSON.parse(String(education)) : {};

  const [permission, requestPermission] = useCameraPermissions();
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [idUri, setIdUri] = useState(null);
  const cameraRef = useRef(null);

  if (!permission) return <View style={[styles.screen, { backgroundColor: BG }]} />;
  if (!permission.granted) {
    return (
      <View style={[styles.screen, { backgroundColor: BG, justifyContent: "center", alignItems: "center" }]}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Camera Permission</Text>
          <Text style={styles.cardText}>We need access to your camera to capture your valid ID.</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const canProceed = idType && idNumber.length >= 4;

  const startCamera = () => setShowCamera(true);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    setIdUri(photo?.uri || null);
    setShowCamera(false);
  };

  // Instruction card
  if (!showCamera && !idUri) {
    return (
      <View style={[styles.screen, { backgroundColor: BG, padding: s(20) }]}>
        <Text style={styles.title}>Valid ID</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Before you proceed</Text>
          <Text style={styles.cardText}>• Choose the ID type you’ll submit</Text>
          <Text style={styles.cardText}>• Enter the ID number (will be sent with your photo)</Text>

          <Text style={[styles.label, { marginTop: vs(8) }]}>ID Type</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={idType}
              onValueChange={(v) => setIdType(String(v))}
              dropdownIconColor="#111"
              style={{ color: "#111" }}
            >
              <Picker.Item label="Select ID Type" value="" />
              <Picker.Item label="PhilSys (National ID)" value="philsys" />
              <Picker.Item label="Student ID (PSAU)" value="student_psau" />
              <Picker.Item label="Philippine Passport" value="passport" />
              <Picker.Item label="Driver’s License" value="drivers_license" />
              <Picker.Item label="SSS UMID" value="sss_umid" />
              <Picker.Item label="PhilHealth ID" value="philhealth" />
              <Picker.Item label="TIN ID" value="tin" />
              <Picker.Item label="Postal ID" value="postal" />
              <Picker.Item label="Voter’s ID" value="voter" />
              <Picker.Item label="PRC ID" value="prc" />
              <Picker.Item label="GSIS ID" value="gsis" />
            </Picker>
          </View>

          <Text style={styles.label}>ID Number</Text>
          <TextInput
            style={styles.lineInput}
            placeholder="Enter ID Number"
            placeholderTextColor={PLACEHOLDER}
            value={idNumber}
            onChangeText={setIdNumber}
          />

          <TouchableOpacity
            style={[styles.button, { marginTop: vs(12), opacity: canProceed ? 1 : 0.6 }]}
            disabled={!canProceed}
            onPress={startCamera}
          >
            <Text style={styles.btnText}>Proceed to Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera
  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={(r) => (cameraRef.current = r)} style={{ flex: 1 }} />
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.button} onPress={takePhoto}>
            <Text style={styles.btnText}>Capture ID</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Preview + continue
  return (
    <View style={[styles.screen, { backgroundColor: BG, padding: s(20) }]}>
      <Text style={styles.title}>Preview Valid ID</Text>
      <View style={styles.card}>
        <Image source={{ uri: idUri }} style={styles.preview} />
        <TouchableOpacity
          style={[styles.button, { marginTop: vs(12) }]}
          onPress={() =>
            router.push({
              pathname: "/confirm",
              params: {
                personal: JSON.stringify(personalData),
                education: JSON.stringify(educationData),
                selfieUri,
                idUri,
                idType,
                idNumber,
              },
            })
          }
        >
          <Text style={styles.btnText}>Use This ID</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { backgroundColor: "red" }]} onPress={() => { setIdUri(null); setShowCamera(false); }}>
          <Text style={styles.btnText}>Retake</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { fontSize: s(22), fontWeight: "700", marginBottom: vs(10) },
  card: {
    backgroundColor: "#fff",
    borderRadius: s(12),
    padding: s(16),
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: s(16), fontWeight: "700", marginBottom: vs(8) },
  cardText: { fontSize: s(14), color: "#55606e", marginBottom: vs(6) },
  button: { backgroundColor: PRIMARY_GREEN, paddingVertical: vs(12), borderRadius: s(10), alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700" },

  label: { fontSize: s(12), fontWeight: "600", color: LABEL, marginBottom: vs(6) },
  lineInput: {
    width: "100%",
    paddingVertical: vs(10),
    fontSize: s(14),
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: s(10),
    marginBottom: vs(12),
    overflow: "hidden",
    backgroundColor: "#fff",
  },

  overlay: { position: "absolute", bottom: vs(28), width: "100%", alignItems: "center" },
  preview: { width: "100%", height: vs(260), borderRadius: s(8), resizeMode: "cover" },
});
