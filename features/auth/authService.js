import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// -----------------------------------------------------------------------------
// Register
// -----------------------------------------------------------------------------
const register = async (userData) => {
  const response = await axios.post(`${API_URL}/api/mobile/users`, userData);
  if (response.data) {
    await AsyncStorage.setItem("user", JSON.stringify(response.data));
  }
  return response.data;
};

// -----------------------------------------------------------------------------
// Login
// -----------------------------------------------------------------------------
const login = async (userData) => {
  const response = await axios.post(`${API_URL}/api/mobile/users/login`, userData);
  const user = response.data;

  if (user.token) await AsyncStorage.setItem("token", user.token);
  await AsyncStorage.setItem("user", JSON.stringify(user));

  return user;
};

// -----------------------------------------------------------------------------
// Update DID
// -----------------------------------------------------------------------------
const updateDID = async (walletAddress) => {
  const user = JSON.parse(await AsyncStorage.getItem("user"));
  if (!user || !user._id) throw new Error("User not found");

  const token = user.token || (await AsyncStorage.getItem("token"));
  if (!token) throw new Error("Missing auth token");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const { data } = await axios.put(
    `${API_URL}/api/mobile/${user._id}/did`,
    { walletAddress }, // ✅ correctly sends the address or null
    config
  );

  const updatedUser = data?.user || data;

  // ✅ Sync to storage
  if (updatedUser) {
    await AsyncStorage.setItem("user", JSON.stringify(updatedUser));
  }

  return updatedUser;
};

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------
const logout = async () => {
  await AsyncStorage.removeItem("user");
  await AsyncStorage.removeItem("token");
};

// -----------------------------------------------------------------------------
const authService = {
  register,
  login,
  updateDID,
  logout,
};

export default authService;
