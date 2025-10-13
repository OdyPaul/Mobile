import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";

const PRIMARY_GREEN = "#28a745";

export default function Selfie() {
  const router = useRouter();
  

const { personal, education } = useLocalSearchParams();
const personalData = personal ? JSON.parse(personal) : {};
const educationData = education ? JSON.parse(education) : {};

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [facing, setFacing] = useState("front");
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  // Handle permission states
  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", marginBottom: 10 }}>Need Camera Permission</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.btnText}>Grant</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleOpenCamera = () => setShowCamera(true);

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
        setPhotoUri(photo?.uri);
        setShowCamera(false);
      } catch (error) {
        console.error("Capture error:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      {!photoUri && !showCamera && (
        <View style={styles.centerBox}>
          <Text style={{ color: "#fff", marginBottom: 20 }}>Take your selfie to continue</Text>
          <TouchableOpacity style={styles.button} onPress={handleOpenCamera}>
            <Text style={styles.btnText}>Open Camera</Text>
          </TouchableOpacity>
        </View>
      )}

      {showCamera && (
        <>
          <CameraView
            ref={(ref) => (cameraRef.current = ref)}
            style={{ flex: 1 }}
            facing={facing}
          />
          <View style={styles.overlay}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: "#6c757d" }]}
              onPress={() => setFacing((prev) => (prev === "front" ? "back" : "front"))}
            >
              <Text style={styles.btnText}>Flip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={takePhoto}>
              <Text style={styles.btnText}>Capture</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {photoUri && (
        <View style={styles.previewBox}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              router.push({
                pathname: "/valid_id",
                params: {
                personal: JSON.stringify(personalData),
                education: JSON.stringify(educationData),
                selfieUri: photoUri,
                },
              })
            }
          >
            <Text style={styles.btnText}>Use This Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "red" }]}
            onPress={() => setPhotoUri(null)}
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
  centerBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  button: {
    padding: 12,
    backgroundColor: PRIMARY_GREEN,
    margin: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  previewBox: { flex: 1, justifyContent: "center", alignItems: "center" },
  preview: { width: "90%", height: "70%", borderRadius: 12 },
  overlay: {
    position: "absolute",
    bottom: 40,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
  },
});
