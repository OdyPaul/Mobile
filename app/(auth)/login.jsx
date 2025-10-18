import React, { useState, useEffect,useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms } from "react-native-size-matters";
import LoginLogo from "../../assets/images/login_logo";
import { login_styles } from "../../assets/styles/login_styles";
import { useDispatch, useSelector } from "react-redux";
import { login, reset } from "../../features/auth/authSlice";
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import verificationService from "../../features/verification/verificationService";
import { moderateScale } from "react-native-size-matters";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [lastUsedCreds, setLastUsedCreds] = useState({ email: "", password: "" });

  const handledPostLoginRef = useRef(false);   // <-- guard
  const biometricPromptedRef = useRef(false);  // <-- guard biometric prompt too (optional)

  const dispatch = useDispatch();
  const router = useRouter();
  const { user, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  // --- Check if biometrics is enabled ---
  useEffect(() => {
    const checkBiometrics = async () => {
      const pref = await AsyncStorage.getItem("@biometric_pref");
      setBiometricEnabled(pref === "true");
    };
    checkBiometrics();
  }, []);

  // --- Try automatic biometric login if enabled ---
 useEffect(() => {
    const tryBiometricLogin = async () => {
      if (!biometricEnabled) return;
      if (biometricPromptedRef.current) return;    // <-- prevent 2nd prompt in dev
      biometricPromptedRef.current = true;

      const savedEmail = await AsyncStorage.getItem("@saved_email");
      const savedPassword = await AsyncStorage.getItem("@saved_password");
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
                  Toast.show({ type: "info", text1: "Logging in...", text2: "Authenticating with biometrics", visibilityTime: 30000 });
                  setLastUsedCreds({ email: savedEmail, password: savedPassword });
                  dispatch(login({ email: savedEmail, password: savedPassword }));
                } else {
                  Toast.show({ type: "error", text1: "Biometric authentication failed" });
                }
              },
            },
          ]
        );
      }, 1000);
    };

    tryBiometricLogin();
  }, [biometricEnabled]);

  // --- Post-login flow ---
 useEffect(() => {
    const handlePostLogin = async () => {
      if (handledPostLoginRef.current) return;   // <-- guard
      if (isError) {
        handledPostLoginRef.current = true;      // mark handled
        Toast.show({ type: "error", text1: "Login Failed", text2: message || "Invalid credentials" });
        dispatch(reset());
        return;
      }

      if (isSuccess || user) {
        handledPostLoginRef.current = true;      // mark handled
        Toast.show({ type: "success", text1: "Login Successful", text2: "Redirecting..." });

        // Save/clear biometrics
        const biometricsChoice = await AsyncStorage.getItem("@biometric_pref");
        if (biometricsChoice === "true") {
          await AsyncStorage.setItem("@saved_email", lastUsedCreds.email || "");
          await AsyncStorage.setItem("@saved_password", lastUsedCreds.password || "");
        } else {
          await AsyncStorage.removeItem("@saved_email");
          await AsyncStorage.removeItem("@saved_password");
        }

        // Check verification (normalize response)
        try {
          const res = await verificationService.getMyVerificationRequests();
          const list = Array.isArray(res) ? res : (res?.data ?? []);
          const hasPending = list.some(r => String(r?.status ?? "").toLowerCase() === "pending");

          if (hasPending) {
            router.replace("/(setup)/pendingVerification");
          } else if (String(user?.verified ?? "unverified").toLowerCase() === "unverified") {
            router.replace("/(setup)/startSetup");
          } else {
            router.replace("/(main)/home");
          }
        } catch (err) {
          console.log("Error checking verification:", err);
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

    Toast.show({
      type: "info",
      text1: "Logging in...",
      text2: "Please wait",
      visibilityTime: 30000,
    });

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
        {/* Email Field */}
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

        {/* Password Field */}
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
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={ms(18)}
              color="#8E8E8E"
            />
          </TouchableOpacity>
        </View>
        {/* 🔒 Biometric toggle below button */}

          <View style={login_styles.biometrics}>
          <Ionicons name="finger-print-outline" size={moderateScale(22)} color="#1E5128" />
          <Text style={login_styles.biometrics_text}>Use Biometrics</Text>
          <TouchableOpacity
            onPress={async () => {
              const newPref = !biometricEnabled;
              setBiometricEnabled(newPref);
              await AsyncStorage.setItem("@biometric_pref", newPref ? "true" : "false");
            }}
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

        {/* Login Button */}
        <TouchableOpacity
          style={login_styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={login_styles.loginText}>Login</Text>
        </TouchableOpacity>



        {/* Footer */}
        <Text style={login_styles.footerText}>
          Don’t have an account?{" "}
          <Text
            style={login_styles.signUpText}
            onPress={() => router.push("/register")}
          >
            Sign Up
          </Text>
        </Text>
      </View>
    </View>
  );
}
