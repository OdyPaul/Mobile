import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { s, vs, ms } from "react-native-size-matters";

export default function Onboarding() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require("../assets/images/bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Bottom Gradient Overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        style={styles.gradient}
      >
        {/* Greyish Transparent Box */}
        <View style={styles.overlayBox}>
          <Text style={styles.title}>Get and share your credentials now!</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/(auth)/login")}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Let's Get Started</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: s(24),
    paddingBottom: vs(80),
  },
  overlayBox: {
    backgroundColor: "rgba(255,255,255,0.15)", // transparent grey overlay
    borderRadius: ms(20),
    paddingVertical: vs(15),
    paddingHorizontal: s(20),
    alignItems: "center",
    backdropFilter: "blur(5px)", // adds subtle blur on web, ignored on native
  },
  title: {
    color: "#fff",
    fontSize: ms(20),
    fontWeight: "700",
    textAlign: "center",
    marginBottom: vs(20),
  },
  button: {
    backgroundColor: "#4CAF50",
    paddingVertical: vs(12),
    paddingHorizontal: s(40),
    borderRadius: ms(30),
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: ms(16),
    fontWeight: "bold",
  },
});
