import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { s, vs } from "react-native-size-matters";

const PRIMARY_GREEN = "#28a745";
const BG = "#f2f4f9";

export default function Selfie() {
  const router = useRouter();
  const { personal, education } = useLocalSearchParams();
  const personalData = personal ? JSON.parse(String(personal)) : {};
  const educationData = education ? JSON.parse(String(education)) : {};

  const [permission, requestPermission] = useCameraPermissions();
  const [photoUri, setPhotoUri] = useState(null);
  const [facing, setFacing] = useState("front");
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) return <View style={[styles.screen, { backgroundColor: BG }]} />;
  if (!permission.granted) {
    return (
      <View
        style={[
          styles.screen,
          { backgroundColor: BG, justifyContent: "center", alignItems: "center" },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Camera Permission</Text>
          <Text style={styles.cardText}>We need access to your camera to take a selfie.</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.btnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const openCamera = () => setShowCamera(true);

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      setPhotoUri(photo?.uri || null);
      setShowCamera(false);
    } catch (e) {}
  };

  // Instruction card (same BG as other pages)
  if (!showCamera && !photoUri) {
    return (
      <View style={[styles.screen, { backgroundColor: BG, padding: s(20) }]}>
        <Text style={styles.title}>Selfie Verification</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Before you proceed</Text>
          <Text style={styles.cardText}>• Clear, even lighting (avoid backlight)</Text>
          <Text style={styles.cardText}>• Center your face, remove hat & sunglasses</Text>
          <Text style={styles.cardText}>• Neutral background, eye-level camera</Text>
          <TouchableOpacity style={[styles.button, { marginTop: vs(12) }]} onPress={openCamera}>
            <Text style={styles.btnText}>Proceed to Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Camera screen
  if (showCamera) {
    return (
      <View style={styles.cameraScreen}>
        <View style={styles.cameraWrapper}>
          <CameraView
            ref={(r) => (cameraRef.current = r)}
            style={{ flex: 1 }}
            facing={facing}
          />
        </View>

        {/* Black bottom bar with padding + actions */}
        <View style={styles.cameraBottomBar}>
          <View style={styles.cameraBottomInner}>
            <TouchableOpacity
              style={[styles.camSmallBtn, { backgroundColor: "#333" }]}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.camCaptureBtn} onPress={takePhoto}>
              <Text style={styles.btnText}>Capture</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.camSmallBtn, { backgroundColor: "#333" }]}
              onPress={() => setFacing((p) => (p === "front" ? "back" : "front"))}
            >
              <Text style={styles.btnText}>Flip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Preview + continue
  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: BG, padding: s(20), alignItems: "center" },
      ]}
    >
      <Text style={styles.title}>Preview Selfie</Text>
      <View style={styles.card}>
        <Image source={{ uri: photoUri }} style={styles.preview} />
        <TouchableOpacity
          style={[styles.button, { marginTop: vs(12) }]}
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
  button: {
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: vs(12),
    borderRadius: s(10),
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },

  // CAMERA UI
  cameraScreen: {
    flex: 1,
    backgroundColor: "#000",
  },
  cameraWrapper: {
    flex: 1,
  },
  cameraBottomBar: {
    backgroundColor: "#000",
    paddingVertical: vs(16),
    paddingHorizontal: s(20),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#222",
  },
  cameraBottomInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  camSmallBtn: {
    flex: 1,
    paddingVertical: vs(10),
    borderRadius: s(999),
    alignItems: "center",
    marginHorizontal: s(4),
  },
  camCaptureBtn: {
    flex: 1.4,
    paddingVertical: vs(12),
    borderRadius: s(999),
    alignItems: "center",
    marginHorizontal: s(4),
    backgroundColor: PRIMARY_GREEN,
  },

  // old overlay kept unused (safe to delete if you want)
  overlay: {
    position: "absolute",
    bottom: vs(28),
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    gap: s(12),
  },

  preview: {
    width: "100%",
    height: vs(260),
    borderRadius: s(8),
    resizeMode: "cover",
  },
});
