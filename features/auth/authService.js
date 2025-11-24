// features/auth/authService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";


const API_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

// -----------------------------------------------------------------------------
// Helper: Persist flat user object
// -----------------------------------------------------------------------------
const persistUser = async (userData) => {
  if (!userData) return;
  await AsyncStorage.setItem("user", JSON.stringify(userData));
  if (userData.token) {
    await AsyncStorage.setItem("token", userData.token);
  }
};

// -----------------------------------------------------------------------------
// REGISTER
// -----------------------------------------------------------------------------
const register = async (userData) => {
  const { data } = await axios.post(`${API_URL}/api/mobile/users`, userData);

  // Normalize shape (some APIs return { user, token })
  const rawUser = data?.user ?? data;
  const token = data?.token ?? rawUser?.token ?? "";

  const flattened = { ...rawUser, token };
  await persistUser(flattened);
  return flattened;
};

// -----------------------------------------------------------------------------
// LOGIN
// -----------------------------------------------------------------------------
const login = async (userData) => {

  const { data } = await axios.post(`${API_URL}/api/mobile/users/login`, userData);
  console.log("Login API Response:", JSON.stringify(data, null, 2));
  const rawUser = data?.user ?? data;
  const token = data?.token ?? rawUser?.token ?? "";
  const flattened = { ...rawUser, token };
  await persistUser(flattened);
  return flattened;
};

// -----------------------------------------------------------------------------
// LOGOUT
// -----------------------------------------------------------------------------
const logout = async () => {
  await AsyncStorage.multiRemove(["user", "token", "walletSession"]);
};

// -----------------------------------------------------------------------------
// OTP
// -----------------------------------------------------------------------------
const requestEmailOtp = async (email) => {
  const { data } = await axios.post(`${API_URL}/api/mobile/otp/request`, { email });
  return data; // { success: true }
};
const verifyEmailOtp = async (email, code) => {
  const { data } = await axios.post(`${API_URL}/api/mobile/otp/verify`, { email, code });
  return data; // { success: true, otpSession }
};

export default {
  register,
  login,
  logout,
  requestEmailOtp,
  verifyEmailOtp,
};
