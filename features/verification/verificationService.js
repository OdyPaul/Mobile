// services/verificationService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
console.log("📡 API_URL at runtime:", API_URL); // must NOT be empty/undefined

const createVerificationRequest = async (data) => {
  try {
    const token = await AsyncStorage.getItem("token");

    const config = {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "Content-Type": "application/json",
      },
    };
    
    console.log("➡️  POST", `${API_URL}/api/verification-request`);
    const response = await axios.post(
      `${API_URL}/api/verification-request`,
      data,
      config
    );

    return response.data;
  } catch (error) {
    console.error("❌ createVerificationRequest error:", error?.response?.data || error);
    throw new Error(
      error.response?.data?.message || error.message || "Something went wrong"
    );
  }
};

export default { createVerificationRequest };
