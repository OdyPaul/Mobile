// app/verification/confirm.jsx
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  LogBox,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useDispatch } from "react-redux";
import {
  scale as s,
  verticalScale as vs,
  moderateScale as ms,
} from "react-native-size-matters";
import * as ImageManipulator from "expo-image-manipulator";
import { createVerificationRequest } from "../../features/verification/verificationSlice";
import { uploadSelfie, uploadId } from "../../features/photo/photoSlice";
import FaceVerifier from "../../lib/faceVerifier"; // adjust path/case to your file

LogBox.ignoreLogs(["InternalBytecode.js", "ENOENT: no such file or directory"]);

/* ------------------------------ helpers ------------------------------ */

const shrink = async (uri) => {
  if (!uri) return uri;
  try {
    const r = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1200 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return r.uri;
  } catch {
    return uri;
  }
};

const safeParse = (data) => {
  try {
    if (!data) return {};
    const value = Array.isArray(data) ? data[0] : data;
    if (!value) return {};
    if (typeof value === "object") return value;
    const str = String(value).trim();
    return str.startsWith("{") || str.startsWith("[") ? JSON.parse(str) : {};
  } catch {
    return {};
  }
};

const fmtDate = (iso) => {
  try {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
};

/* -------------------------------------------------------------------- */

export default function Confirm() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  // Normalize params (expo-router can give string | string[])
  const selfieUri = Array.isArray(params.selfieUri)
    ? params.selfieUri[0]
    : params.selfieUri;
  const idUri = Array.isArray(params.idUri) ? params.idUri[0] : params.idUri;
  const idType = Array.isArray(params.idType) ? params.idType[0] : params.idType;
  const idNumber = Array.isArray(params.idNumber)
    ? params.idNumber[0]
    : params.idNumber;

  const personalData = safeParse(params.personal);
  const educationData = safeParse(params.education);

  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  // Liveness integration
  const [showFaceVerifier, setShowFaceVerifier] = useState(false);

  const prettyIdType = {
    philsys: "PhilSys (National ID)",
    student_psau: "Student ID (PSAU)",
    passport: "Philippine Passport",
    drivers_license: "Driver’s License",
    sss_umid: "SSS UMID",
    philhealth: "PhilHealth ID",
    tin: "TIN ID",
    postal: "Postal ID",
    voter: "Voter’s ID",
    prc: "PRC ID",
    gsis: "GSIS ID",
  };

  const validate = () => {
    if (
      !personalData?.fullName ||
      !personalData?.address ||
      !personalData?.birthPlace ||
      !personalData?.birthDate
    ) {
      Alert.alert("Missing info", "Personal information is incomplete.");
      return false;
    }

    if (
      !educationData?.highSchool ||
      !educationData?.admissionDate ||
      !educationData?.graduationDate
    ) {
      Alert.alert("Missing info", "Education information is incomplete.");
      return false;
    }

    if (!selfieUri || !idUri) {
      Alert.alert(
        "Missing images",
        "Please provide both a selfie and a valid ID."
      );
      return false;
    }

    return true;
  };

  // Actual send after liveness passes
  const submitAfterLiveness = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);

    try {
      const [shrunkSelfie, shrunkId] = await Promise.all([
        shrink(String(selfieUri)),
        shrink(String(idUri)),
      ]);

      const [selfieRes, idRes] = await Promise.all([
        dispatch(
          uploadSelfie({
            uri: shrunkSelfie,
            name: "selfie.jpg",
            type: "image/jpeg",
          })
        ).unwrap(),
        dispatch(
          uploadId({
            uri: shrunkId,
            name: "id.jpg",
            type: "image/jpeg",
          })
        ).unwrap(),
      ]);

      const selfieImageId = selfieRes?._id || selfieRes?.id;
      const idImageId = idRes?._id || idRes?.id;

      if (!selfieImageId || !idImageId) {
        throw new Error("Upload response missing ids");
      }

      await dispatch(
        createVerificationRequest({
          personal: personalData,
          education: educationData,
          selfieImageId,
          idImageId,
          idMeta: {
            idType: idType || null,
            idNumber: idNumber || null,
          },
        })
      ).unwrap();

      Alert.alert("✅ Success", "Verification submitted successfully!");
      router.push("/(main)/settings");
    } catch (err) {
      Alert.alert("Error", String(err?.message || "Submission failed"));
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleSubmitPress = () => {
    if (inFlightRef.current) return;
    if (!validate()) return;
    // 👉 Immediately run liveness check; camera auto inside FaceVerifier
    setShowFaceVerifier(true);
  };

  /* ---------- Swap the whole screen to FaceVerifier when needed ---------- */
  if (showFaceVerifier) {
    return (
      <FaceVerifier
        onClose={() => setShowFaceVerifier(false)}
        onPassed={() => {
          setShowFaceVerifier(false);
          submitAfterLiveness(); // send request when liveness passes
        }}
      />
    );
  }

  /* -------------------------------------------------------------------- */

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.background} />

      <Text style={styles.title}>Confirm Your Info</Text>

      {/* Personal Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Personal</Text>

        <View style={styles.row}>
          <Text style={styles.key}>Full name</Text>
          <Text style={styles.val}>{personalData.fullName || "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.key}>Address</Text>
          <Text style={styles.val}>{personalData.address || "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.key}>Birth place</Text>
          <Text style={styles.val}>{personalData.birthPlace || "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.key}>Birth date</Text>
          <Text style={styles.val}>{fmtDate(personalData.birthDate)}</Text>
        </View>
      </View>

      {/* Education Info */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Education</Text>

        <View style={styles.row}>
          <Text style={styles.key}>High School</Text>
          <Text style={styles.val}>{educationData.highSchool || "—"}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.key}>Admission to PSAU</Text>
          <Text style={styles.val}>{fmtDate(educationData.admissionDate)}</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.key}>Graduation</Text>
          <Text style={styles.val}>{fmtDate(educationData.graduationDate)}</Text>
        </View>
      </View>

      {/* Selfie Preview */}
      {selfieUri ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selfie</Text>
          <Image source={{ uri: String(selfieUri) }} style={styles.image} />
        </View>
      ) : null}

      {/* ID Preview */}
      {idUri ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Valid ID</Text>

          <View style={styles.row}>
            <Text style={styles.key}>Type</Text>
            <Text style={styles.val}>
              {prettyIdType[String(idType)] || String(idType || "—")}
            </Text>
          </View>

          {idNumber ? (
            <View style={styles.row}>
              <Text style={styles.key}>ID Number</Text>
              <Text style={styles.val}>{String(idNumber)}</Text>
            </View>
          ) : null}

          <Image source={{ uri: String(idUri) }} style={styles.image} />
        </View>
      ) : null}

      {/* Submit button */}
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSubmitPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: s(20),
    alignItems: "center",
    backgroundColor: "#f2f4f9",
  },
  background: {
    position: "absolute",
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: "#E6F0FF",
    borderRadius: ms(50),
    zIndex: -1,
  },
  title: {
    fontSize: s(24),
    fontWeight: "700",
    marginBottom: vs(16),
    textAlign: "center",
    color: "#111827",
  },
  sectionTitle: {
    fontSize: s(16),
    fontWeight: "700",
    marginBottom: vs(10),
    color: "#111827",
  },
  card: {
    backgroundColor: "#fff",
    padding: s(15),
    borderRadius: s(12),
    marginBottom: vs(14),
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: s(10),
    marginBottom: vs(6),
  },
  key: {
    color: "#6b7280",
    fontWeight: "600",
    width: "45%",
  },
  val: {
    color: "#111827",
    flex: 1,
    textAlign: "right",
    fontWeight: "500",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: s(10),
    marginTop: vs(10),
    resizeMode: "cover",
  },
  button: {
    backgroundColor: "#00B365",
    paddingVertical: vs(12),
    borderRadius: s(10),
    marginTop: vs(16),
    width: "90%",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: s(18),
    fontWeight: "700",
  },
});
