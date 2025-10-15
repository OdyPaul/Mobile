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
  console.log("Login API Response:", JSON.stringify(data, null, 2)); // 👈 add this

  const rawUser = data?.user ?? data;
  const token = data?.token ?? rawUser?.token ?? "";

  const flattened = { ...rawUser, token };
  await persistUser(flattened);
  return flattened;
};


// -----------------------------------------------------------------------------
// UPDATE DID
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
// LOGOUT
// -----------------------------------------------------------------------------
const logout = async () => {
  await AsyncStorage.removeItem("user");
  await AsyncStorage.removeItem("token");
};

// -----------------------------------------------------------------------------
// EXPORT
// -----------------------------------------------------------------------------
export default {
  register,
  login,
  updateDID,
  logout,
};
