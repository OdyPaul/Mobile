// services/verificationService.js
import axios from "axios";
const API_URL = process.env.EXPO_PUBLIC_API_URL;
import AsyncStorage from "@react-native-async-storage/async-storage";

const createVerificationRequest = async ({ personal, education, selfieImageId, idImageId }) => {
  const token = await AsyncStorage.getItem("token");
  const config = {
    headers: {
      Authorization: `Bearer ${token ? JSON.parse(token) : ""}`,
      "Content-Type": "application/json",
    },
  };

  const body = { personal, education, selfieImageId, idImageId };
  const res = await axios.post(`${API_URL}/api/verification-request`, body, config); // ✅ updated path
  return res.data;
};

export default { createVerificationRequest };
