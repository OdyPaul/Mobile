import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { s, vs } from "react-native-size-matters";
import { SafeAreaView } from "react-native-safe-area-context";
import AppLogo from "../../assets/images/app_logo"; 
import {register_styles}  from "../../assets/styles/register_styles";

export default function Register() {
  const router = useRouter();
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <SafeAreaView style={register_styles.container}>
      <View style={register_styles.card}>
        {/* Logo + Title */}
        <View style={register_styles.headerRow}>
          <Text style={register_styles.title}>AAS</Text>
          <AppLogo width={s(60)} height={vs(60)} />
        </View>
        <Text style={register_styles.subtitle}>Credential Wallet</Text>

        {/* Input Fields */}
        <View style={register_styles.inputContainer}>
          <Ionicons
            name="person-outline"
            size={20}
            color="#6b7280"
            style={register_styles.icon}
          />
          <TextInput placeholder="Full Name" style={register_styles.input} />
        </View>

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
            style={register_styles.input}
          />
        </View>

        {/* Password Field with Eye Toggle */}
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

        {/* Sign Up Button */}
        <TouchableOpacity style={register_styles.button}>
          <Text style={register_styles.buttonText}>Sign Up</Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={register_styles.footer}>
          <Text style={register_styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={register_styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

