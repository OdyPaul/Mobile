import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms } from "react-native-size-matters";
import LoginLogo from "../../assets/images/login_logo";
import { login_styles } from "../../assets/styles/login_styles";
import { useDispatch, useSelector } from "react-redux";
import { login, reset } from "../../features/auth/authSlice";
import Toast from "react-native-toast-message";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const router = useRouter();
  console.log("Dispatch:", dispatch);

  const { user, isError, isSuccess, message } = useSelector((state) => state.auth);

  const handleLogin = () => {
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

  useEffect(() => {
  if (isError) {
    Toast.show({
      type: "error",
      text1: "Login Failed",
      text2: message || "Invalid credentials",
    });
    dispatch(reset());
  }

  if (isSuccess || user) {
    Toast.show({
      type: "success",
      text1: "Login Successful",
      text2: "Redirecting...",
    });

    // ✅ Check verification status
    if (user?.verified === "unverified") {
      router.replace("/(setup)/startSetup");
    } else {
      router.replace("/(main)/home");
    }

    dispatch(reset());
  }
}, [user, isError, isSuccess, message, dispatch]);


  return (
    <View style={login_styles.container}>
      {/* Logo / Illustration */}
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
