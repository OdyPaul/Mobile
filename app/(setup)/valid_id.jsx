import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Picker } from "@react-native-picker/picker";
import { s, vs } from "react-native-size-matters";

const PRIMARY_GREEN = "#28a745";

export default function ValidId() {
  const router = useRouter();

const { personal, education, selfieUri } = useLocalSearchParams();
const personalData = personal ? JSON.parse(personal) : {};
const educationData = education ? JSON.parse(education) : {};

  const [permission, requestPermission] = useCameraPermissions();
  const [idType, setIdType] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [idUri, setIdUri] = useState(null);
  const cameraRef = useRef(null);

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", marginBottom: 10 }}>
          Need Camera Permission
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.btnText}>Grant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        setIdUri(photo?.uri);
        setShowCamera(false);
      } catch (error) {
        console.error("Capture error:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Step: Choose ID type before capture */}
      {!showCamera && !idUri && (
        <View style={[styles.form, styles.centerContent]}>
          <Text style={styles.title}>Valid ID Information</Text>
          <Text style={{ marginBottom: vs(10), color: "#ccc" }}>
            Please select your ID type before capturing.
          </Text>

          <View style={styles.pickerBox}>
            <Picker
              selectedValue={idType}
              onValueChange={(itemValue) => setIdType(itemValue)}
              dropdownIconColor="#fff"
              style={{ color: "#fff" }}
            >
              <Picker.Item label="Select ID Type" value="" />
              <Picker.Item label="PhilSys (National ID)" value="philsys" />
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

          <TouchableOpacity
            style={[styles.button, { opacity: idType ? 1 : 0.5 }]}
            disabled={!idType}
            onPress={() => setShowCamera(true)}
          >
            <Text style={styles.btnText}>Start Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.smallBtn, { marginTop: vs(10) }]}
            onPress={() => router.back()}
          >
            <Text style={styles.btnText}>← Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Camera capture */}
      {showCamera && (
        <>
          <CameraView ref={cameraRef} style={{ flex: 1 }} />
          <TouchableOpacity
            style={[styles.smallBtn, { position: "absolute", top: vs(20), left: s(10) }]}
            onPress={() => setShowCamera(false)}
          >
            <Text style={styles.btnText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.overlay}>
            <TouchableOpacity
              style={[
                styles.button,
                !idType && { backgroundColor: "#ccc" },
              ]}
              disabled={!idType}
              onPress={takePhoto}
            >
              <Text style={styles.btnText}>
                {idType ? "Capture ID" : "Select ID Type First"}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ID Preview */}
      {idUri && (
        <View style={styles.previewBox}>
          <Image source={{ uri: idUri }} style={styles.preview} />
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
            router.push({
              pathname: "/confirm",
              params: {
              personal: JSON.stringify(personalData),
              education: JSON.stringify(educationData),
              selfieUri,
              idUri,
              idType,
              },
            })
            }
          >
            <Text style={styles.btnText}>Use This ID</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "red" }]}
            onPress={() => {
              setIdUri(null);
              setShowCamera(false);
            }}
          >
            <Text style={styles.btnText}>Retake</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  title: { color: "#fff", fontSize: s(18), fontWeight: "600", marginBottom: vs(10) },
  form: { padding: s(20), width: "100%" },
  centerContent: { justifyContent: "center", alignItems: "center", flex: 1 },
  pickerBox: {
    width: "90%",
    backgroundColor: "#1e1e1e",
    borderRadius: s(8),
    marginBottom: vs(20),
  },
  button: {
    padding: s(12),
    backgroundColor: PRIMARY_GREEN,
    borderRadius: s(10),
    marginVertical: vs(8),
    width: "90%",
    alignItems: "center",
  },
  smallBtn: {
    backgroundColor: "#6c757d",
    padding: s(10),
    borderRadius: s(8),
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  previewBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  preview: { width: "90%", height: "70%", borderRadius: 12 },
  overlay: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    alignItems: "center",
  },
});
