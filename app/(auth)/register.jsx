// app/register.js (or wherever your Register component is)
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { s, vs } from "react-native-size-matters";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLogo from "../../assets/images/app_logo";
import { register_styles } from "../../assets/styles/register_styles";
import authService from "../../features/auth/authService";

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  const continueToVerify = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    try {
      setSendingOtp(true);
      await authService.requestEmailOtp(email.trim());

      Alert.alert(
        "OTP 6-digit code sent!",
        "Check your inbox and enter it on the next screen."
      );

      router.replace({
        pathname: "/verify_email",
        params: {
          email: email.trim(),
          username: fullName.trim(),
          password,
        },
      });
    } catch (e) {
      Alert.alert(
        "Failed to send OTP",
        e?.response?.data?.message || e?.message || "Try again."
      );
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <SafeAreaView style={register_styles.container}>
      <View style={register_styles.card}>
        <View style={register_styles.headerRow}>
          <Text style={register_styles.title}>CredPocket</Text>
          <AppLogo width={s(60)} height={vs(60)} />
        </View>
        <Text style={register_styles.subtitle}>Credential Wallet</Text>

        {/* Name */}
        <View style={{ width: "100%" }}>
          <Text style={register_styles.inputLabel}>Username</Text>
          <View style={register_styles.inputContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#6b7280"
              style={register_styles.icon}
            />
            <TextInput
              placeholder="Username"
              value={fullName}
              onChangeText={setFullName}
              style={register_styles.input}
            />
          </View>
        </View>

        {/* Email */}
        <View style={{ width: "100%", marginTop: 8 }}>
          <Text style={register_styles.inputLabel}>Email</Text>
          <View
            style={[
              register_styles.inputContainer,
              { alignItems: "center" },
            ]}
          >
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
              style={[register_styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        {/* Password */}
        <View style={{ width: "100%", marginTop: 8 }}>
          <Text style={register_styles.inputLabel}>Password</Text>
          <View style={register_styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#6b7280"
              style={register_styles.icon}
            />
            <TextInput
              placeholder="Password"
              secureTextEntry={!passwordVisible}
              value={password}
              onChangeText={setPassword}
              style={register_styles.input}
            />
            <TouchableOpacity
              onPress={() => setPasswordVisible(!passwordVisible)}
              style={register_styles.eyeIcon}
            >
              <Ionicons
                name={passwordVisible ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#6b7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[
            register_styles.button,
            { opacity: sendingOtp ? 0.6 : 1, marginTop: vs(16) },
          ]}
          onPress={continueToVerify}
          disabled={sendingOtp}
        >
          <Text style={register_styles.buttonText}>
            {sendingOtp ? "Sending OTP..." : "Continue"}
          </Text>
        </TouchableOpacity>

        <View style={register_styles.footer}>
          <Text style={register_styles.footerText}>
            Already have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={register_styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
