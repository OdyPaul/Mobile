import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { s, vs } from "react-native-size-matters";
import { useDispatch, useSelector } from "react-redux";
import authService from "../../features/auth/authService";
import { register as registerThunk, reset } from "../../features/auth/authSlice";
import { register_styles } from "../../assets/styles/register_styles";

export default function VerifyEmail() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading, isError, isSuccess, message } = useSelector((s) => s.auth);

  const params = useLocalSearchParams();
  const [email] = useState(String(params.email || ""));
  const [username] = useState(String(params.username || ""));
  const [password] = useState(String(params.password || ""));
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);


  useEffect(() => {
    if (isError && message) {
      Alert.alert("Registration Failed", String(message));
      dispatch(reset());
    }
    if (isSuccess) {
      Alert.alert("Account created", "You can now log in.");
      dispatch(reset());
      router.replace("/login");
    }
  }, [isError, isSuccess, message]);

  const resend = async () => {
    try {
      setSending(true);
      await authService.requestEmailOtp(email);
      Alert.alert("OTP sent", "Check your inbox for a 6-digit code.");
    } catch (e) {
      Alert.alert("Failed to send OTP", e?.response?.data?.message || e?.message || "Try again.");
    } finally {
      setSending(false);
    }
  };

  const verifyAndRegister = async () => {
    if (!code.trim()) {
      Alert.alert("Missing code", "Enter the 6-digit code.");
      return;
    }
    try {
      setVerifying(true);
      const { success, otpSession } = await authService.verifyEmailOtp(email, code.trim());
      if (!success || !otpSession) {
        Alert.alert("Invalid code", "Please try again.");
        setVerifying(false);
        return;
      }
      // ✅ Now actually register (server requires otpSession)
      dispatch(registerThunk({ username, email, password, otpSession }));
    } catch (e) {
      Alert.alert("Verification failed", e?.response?.data?.message || e?.message || "Try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={register_styles.container}>
      <View style={register_styles.card}>
        <Text style={register_styles.title}>Verify your email</Text>
        <Text style={register_styles.subtitle}>We sent a 6-digit code to:</Text>
        <Text style={{ marginTop: 6, fontWeight: "600" }}>{email}</Text>

        <View style={[register_styles.inputContainer, { marginTop: vs(12) }]}>
          <Ionicons name="key-outline" size={20} color="#6b7280" style={register_styles.icon} />
          <TextInput
            placeholder="6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            style={register_styles.input}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 8, marginTop: vs(12) }}>
          <TouchableOpacity
            style={[register_styles.button, { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" }]}
            onPress={resend}
            disabled={sending}
          >
            {sending ? <ActivityIndicator /> : <Text style={[register_styles.buttonText, { color: "#111827" }]}>Resend OTP</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[register_styles.button, { flex: 1, opacity: (verifying || isLoading) ? 0.6 : 1 }]}
            onPress={verifyAndRegister}
            disabled={verifying || isLoading}
          >
            <Text style={register_styles.buttonText}>
              {verifying || isLoading ? "Creating..." : "Verify & Create"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={register_styles.footer}>
          <Text style={register_styles.footerText}>Wrong email? </Text>
          <TouchableOpacity onPress={() => router.replace("/register")}>
            <Text style={register_styles.loginLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
