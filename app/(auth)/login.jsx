import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms, moderateScale } from "react-native-size-matters";
import LoginLogo from "../../assets/images/login_logo";
import { login_styles } from "../../assets/styles/login_styles";
import { useDispatch, useSelector } from "react-redux";
import { login, reset } from "../../features/auth/authSlice";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import verificationService from "../../features/verification/verificationService";
import useBiometricPref from "../../hooks/useBiometricPref";
import { normalizeVerificationList, hasPending, STORAGE_KEYS } from "../../lib";
import { refreshNotifications } from "../../features/notif/notifSlice";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lastUsedCreds, setLastUsedCreds] = useState({ email: "", password: "" });

  // Reuse biometric hook
  const { enabled: biometricEnabled, toggle: setBiometricPref } = useBiometricPref();

  // Guards
  const navigatedRef = useRef(false);          // prevent double navigation on success
  const biometricPromptedRef = useRef(false);  // prevent double biometric prompt in dev

  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isError, isSuccess, message } = useSelector((s) => s.auth);

  // --- Try automatic biometric login if enabled ---
  useEffect(() => {
    const tryBiometricLogin = async () => {
      if (!biometricEnabled) return;
      if (biometricPromptedRef.current) return; // React 18 StrictMode guard
      biometricPromptedRef.current = true;

      const savedEmail = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_EMAIL);
      const savedPassword = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_PASSWORD);
      if (!savedEmail || !savedPassword) return;

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const supported = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !supported) return;

      setTimeout(() => {
        Alert.alert(
          "Login with Biometrics",
          "Would you like to log in using your saved biometrics?",
          [
            { text: "No", style: "cancel" },
            {
              text: "Yes",
              onPress: async () => {
                const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: "Authenticate to log in",
                });
                if (result.success) {
                  Toast.show({
                    type: "info",
                    text1: "Logging in...",
                    text2: "Authenticating with biometrics",
                    visibilityTime: 30000,
                  });
                  setLastUsedCreds({ email: savedEmail, password: savedPassword });
                  dispatch(login({ email: savedEmail, password: savedPassword }));
                } else {
                  Toast.show({ type: "error", text1: "Biometric authentication failed" });
                }
              },
            },
          ]
        );
      }, 800);
    };

    tryBiometricLogin();
  }, [biometricEnabled, dispatch]);

  // --- Post-login flow ---
  useEffect(() => {
    const ensureToken = async () => {
      // token could be in user or persisted:
      let token = user?.token || (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN));
      if (token) return token;
      // retry a bit to avoid a race with persistence
      for (let i = 0; i < 3; i++) {
        await new Promise((r) => setTimeout(r, 150));
        token = user?.token || (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN));
        if (token) return token;
      }
      return null;
    };

    const handlePostLogin = async () => {
      if (isError) {
        // Do NOT set the nav guard here; allow retry to navigate later
        Toast.show({ type: "error", text1: "Login Failed", text2: message || "Invalid credentials" });
        dispatch(reset());
        return;
      }

      if ((isSuccess || user) && !navigatedRef.current) {
        navigatedRef.current = true; // only guard when we’re going to navigate
        Toast.show({ type: "success", text1: "Login Successful", text2: "Redirecting..." });

        // Save/clear biometric creds
        const pref = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRIC_PREF);
        if (pref === "true") {
          await AsyncStorage.multiSet([
            [STORAGE_KEYS.SAVED_EMAIL, lastUsedCreds.email || ""],
            [STORAGE_KEYS.SAVED_PASSWORD, lastUsedCreds.password || ""],
          ]);
        } else {
          await AsyncStorage.multiRemove([STORAGE_KEYS.SAVED_EMAIL, STORAGE_KEYS.SAVED_PASSWORD]);
        }

        // Check verification (normalize + robust)
        try {
          const token = await ensureToken();
          if (!token) {
            router.replace("/(main)/home");
            dispatch(reset());
            return;
          }
        // 🔔 Preload activity items so Activity has data instantly
        dispatch(refreshNotifications());

          const res = await verificationService.getMyVerificationRequests();
          const list = normalizeVerificationList(res);
          const pending = hasPending(list);
          const isUnverified = String(user?.verified ?? "unverified").toLowerCase() === "unverified";

          if (pending) {
            // If already has a pending request, do NOT show pending screen on login
            router.replace("/(main)/home");
          } else if (isUnverified) {
            // No pending yet but user is unverified → start setup
            router.replace("/(setup)/startSetup");
          } else {
            // Verified → home
            router.replace("/(main)/home");
          }
        } catch (err) {
          // On any error, just go home
          router.replace("/(main)/home");
        }

        dispatch(reset());
      }
    };

    handlePostLogin();
  }, [user, isError, isSuccess, message, dispatch, router, lastUsedCreds]);

  // --- Manual login handler ---
  const handleLogin = () => {
    setLastUsedCreds({ email, password });
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    Toast.show({ type: "info", text1: "Logging in...", text2: "Please wait", visibilityTime: 30000 });
    dispatch(login({ email, password }));
  };

  return (
    <View style={login_styles.container}>
      {/* Logo */}
      <View style={login_styles.logoContainer}>
        <LoginLogo width={s(300)} height={vs(280)} />
      </View>

      {/* Form */}
      <View style={login_styles.formCard}>
        {/* Email */}
        <View style={login_styles.inputWrapper}>
          <Ionicons name="mail-outline" size={ms(18)} color="#8E8E8E" />
          <TextInput
            placeholder="Enter your email"
            style={login_styles.input}
            placeholderTextColor="#A0A0A0"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={login_styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={ms(18)} color="#8E8E8E" />
          <TextInput
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            style={login_styles.input}
            placeholderTextColor="#A0A0A0"
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
            <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={ms(18)} color="#8E8E8E" />
          </TouchableOpacity>
        </View>

        {/* Biometrics toggle (uses hook state) */}
        <View style={login_styles.biometrics}>
          <Ionicons name="finger-print-outline" size={moderateScale(22)} color="#1E5128" />
          <Text style={login_styles.biometrics_text}>Use Biometrics</Text>
          <TouchableOpacity
            onPress={() => setBiometricPref(!biometricEnabled)}
            style={{
              width: 50,
              height: 25,
              borderRadius: 15,
              backgroundColor: biometricEnabled ? "#4CAF50" : "#ccc",
              justifyContent: "center",
              alignItems: biometricEnabled ? "flex-end" : "flex-start",
              paddingHorizontal: 5,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: "white",
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Login */}
        <TouchableOpacity style={login_styles.loginButton} onPress={handleLogin} activeOpacity={0.8}>
          <Text style={login_styles.loginText}>Login</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={login_styles.footerText}>
          Don’t have an account?{" "}
          <Text style={login_styles.signUpText} onPress={() => router.push("/register")}>
            Sign Up
          </Text>
        </Text>
      </View>
    </View>
  );
}
