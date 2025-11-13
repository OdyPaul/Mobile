import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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

  // ✅ OTP digits state
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);

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

  // Handle typing in each OTP box
  const handleChangeOtp = (index, value) => {
    // Allow only a single digit or empty
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);

    // Auto-jump to next input when a digit is entered
    if (value && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation
  const handleKeyPress = (index, e) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const resend = async () => {
    try {
      setSending(true);
      await authService.requestEmailOtp(email);
      Alert.alert("OTP 6-digit code sent!", "Check your inbox for a new code.");
    } catch (e) {
      Alert.alert("Failed to send OTP", e?.response?.data?.message || e?.message || "Try again.");
    } finally {
      setSending(false);
    }
  };

  const verifyAndRegister = async () => {
    const code = otpDigits.join("");

    if (code.length !== 6) {
      Alert.alert("Missing code", "Enter the 6-digit code.");
      return;
    }

    try {
      setVerifying(true);
      const { success, otpSession } = await authService.verifyEmailOtp(email, code);

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

        {/* ✅ OTP sent message */}
        <Text
          style={[
            register_styles.subtitle,
            { color: "#16a34a", marginTop: vs(8), marginBottom: 4 },
          ]}
        >
          OTP 6-digit code sent!
        </Text>
        <Text style={register_styles.subtitle}>We sent it to:</Text>
        <Text style={{ marginTop: 4, fontWeight: "600" }}>{email}</Text>

        {/* ✅ OTP Boxes */}
        <View style={register_styles.otpWrapper}>
          <Text style={register_styles.otpLabel}>Enter your 6-digit code</Text>
          <View style={register_styles.otpContainer}>
            {otpDigits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputsRef.current[index] = ref)}
                style={register_styles.otpInput}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(value) => handleChangeOtp(index, value)}
                onKeyPress={(e) => handleKeyPress(index, e)}
                returnKeyType="next"
              />
            ))}
          </View>
        </View>

        {/* Buttons */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: vs(20) }}>
          <TouchableOpacity
            style={[
              register_styles.button,
              { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
            ]}
            onPress={resend}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator />
            ) : (
              <Text style={[register_styles.buttonText, { color: "#111827" }]}>
                Resend OTP
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              register_styles.button,
              { flex: 1, opacity: verifying || isLoading ? 0.6 : 1 },
            ]}
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
