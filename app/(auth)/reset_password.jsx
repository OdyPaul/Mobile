// app/reset_password.jsx
import React, { useState, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { s, vs } from "react-native-size-matters";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import authService from "../../features/auth/authService";
import { register_styles } from "../../assets/styles/register_styles";

export default function ResetPassword() {
  const router = useRouter();

  const [step, setStep] = useState("EMAIL"); // EMAIL -> OTP -> PASSWORD

  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const inputsRef = useRef([]);

  const [resetSession, setResetSession] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwVisible, setPwVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [loading, setLoading] = useState(false);

  const cleanEmail = email.trim().toLowerCase();

  const sendCode = async () => {
    if (!cleanEmail) {
      Alert.alert("Missing email", "Please enter your email.");
      return;
    }
    try {
      setLoading(true);
      await authService.requestPasswordResetOtp(cleanEmail);
      Alert.alert("Code sent", "A 6-digit reset code was sent to your email.");
      setStep("OTP");
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeOtp = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < inputsRef.current.length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, e) => {
    if (e.nativeEvent.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const verifyCode = async () => {
    const code = otpDigits.join("");
    if (code.length !== 6) {
      Alert.alert("Missing code", "Enter the 6-digit code.");
      return;
    }
    try {
      setLoading(true);
      const { success, resetSession } = await authService.verifyPasswordResetOtp(cleanEmail, code);
      if (!success || !resetSession) {
        Alert.alert("Invalid code", "Please try again.");
        setLoading(false);
        return;
      }
      setResetSession(resetSession);
      Alert.alert("Verified", "Now set a new password.");
      setStep("PASSWORD");
    } catch (e) {
      Alert.alert("Verification failed", e?.response?.data?.message || e?.message || "Try again.");
    } finally {
      setLoading(false);
    }
  };

  const applyNewPassword = async () => {
    if (!newPassword || !confirm) {
      Alert.alert("Missing fields", "Please fill in both password fields.");
      return;
    }
    if (newPassword !== confirm) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }
    if (!resetSession) {
      Alert.alert("Session error", "Reset session missing. Please request a new code.");
      setStep("EMAIL");
      return;
    }

    try {
      setLoading(true);
      await authService.resetPassword({ email: cleanEmail, resetSession, newPassword });
      Alert.alert("Password updated", "You can now log in with your new password.", [
        { text: "OK", onPress: () => router.replace("/login") },
      ]);
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || e?.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <>
      <Text style={register_styles.title}>Reset Password</Text>
      <Text style={register_styles.subtitle}>
        Enter your email and we'll send you a 6-digit code.
      </Text>

      <View style={{ width: "100%", marginTop: vs(16) }}>
        <Text style={register_styles.inputLabel}>Email</Text>
        <View style={register_styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#6b7280"
            style={register_styles.icon}
          />
          <TextInput
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            style={register_styles.input}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[
          register_styles.button,
          { marginTop: vs(20), opacity: loading ? 0.6 : 1 },
        ]}
        onPress={sendCode}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={register_styles.buttonText}>Send Code</Text>
        )}
      </TouchableOpacity>
    </>
  );

  const renderOtpStep = () => (
    <>
      <Text style={register_styles.title}>Enter Code</Text>
      <Text style={register_styles.subtitle}>
        Enter the 6-digit code sent to {cleanEmail}.
      </Text>

      <View style={register_styles.otpWrapper}>
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
            />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: vs(20) }}>
        <TouchableOpacity
          style={[
            register_styles.button,
            { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
          ]}
          onPress={sendCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Text style={[register_styles.buttonText, { color: "#111827" }]}>
              Resend
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            register_styles.button,
            { flex: 1, opacity: loading ? 0.6 : 1 },
          ]}
          onPress={verifyCode}
          disabled={loading}
        >
          <Text style={register_styles.buttonText}>
            {loading ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderPasswordStep = () => (
    <>
      <Text style={register_styles.title}>New Password</Text>
      <Text style={register_styles.subtitle}>
        Set a new password for {cleanEmail}.
      </Text>

      {/* New password */}
      <View style={{ width: "100%", marginTop: vs(16) }}>
        <Text style={register_styles.inputLabel}>New Password</Text>
        <View style={register_styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#6b7280"
            style={register_styles.icon}
          />
          <TextInput
            placeholder="New password"
            secureTextEntry={!pwVisible}
            value={newPassword}
            onChangeText={setNewPassword}
            style={register_styles.input}
          />
          <TouchableOpacity
            onPress={() => setPwVisible(!pwVisible)}
            style={register_styles.eyeIcon}
          >
            <Ionicons
              name={pwVisible ? "eye-outline" : "eye-off-outline"}
              size={22}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm password */}
      <View style={{ width: "100%", marginTop: vs(8) }}>
        <Text style={register_styles.inputLabel}>Confirm Password</Text>
        <View style={register_styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#6b7280"
            style={register_styles.icon}
          />
          <TextInput
            placeholder="Confirm password"
            secureTextEntry={!confirmVisible}
            value={confirm}
            onChangeText={setConfirm}
            style={register_styles.input}
          />
          <TouchableOpacity
            onPress={() => setConfirmVisible(!confirmVisible)}
            style={register_styles.eyeIcon}
          >
            <Ionicons
              name={confirmVisible ? "eye-outline" : "eye-off-outline"}
              size={22}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[
          register_styles.button,
          { marginTop: vs(20), opacity: loading ? 0.6 : 1 },
        ]}
        onPress={applyNewPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={register_styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={register_styles.container}>
      <View style={register_styles.card}>
        {step === "EMAIL" && renderEmailStep()}
        {step === "OTP" && renderOtpStep()}
        {step === "PASSWORD" && renderPasswordStep()}

        <View style={register_styles.footer}>
          <Text style={register_styles.footerText}>Remembered it? </Text>
          <TouchableOpacity onPress={() => router.replace("/login")}>
            <Text style={register_styles.loginLink}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
