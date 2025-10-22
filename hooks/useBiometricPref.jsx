import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";

export default function useBiometricPref() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const pref = await AsyncStorage.getItem("@biometric_pref");
      setEnabled(pref === "true");
    })();
  }, []);

  const toggle = async (value) => {
    try {
      setEnabled(value);
      await AsyncStorage.setItem("@biometric_pref", value ? "true" : "false");
      Toast.show({
        type: "success",
        text1: value ? "Biometrics enabled" : "Biometrics disabled",
      });
    } catch (error) {
      console.error("Error saving biometric preference:", error);
    }
  };

  return { enabled, toggle };
}
