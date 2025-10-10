import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { s, vs, ms } from "react-native-size-matters";
import LoginLogo from "../../assets/images/login_logo";
import { login_styles } from "../../assets/styles/login_styles";

export default function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

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
        <TouchableOpacity style={login_styles.loginButton}>
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

