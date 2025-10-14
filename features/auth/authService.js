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

  // Normalize shape
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
  const raw = await AsyncStorage.getItem("user");
  const storedUser = raw ? JSON.parse(raw) : null;

  if (!storedUser?._id) throw new Error("User not found in storage");
  const token = storedUser?.token || (await AsyncStorage.getItem("token"));
  if (!token) throw new Error("Missing auth token");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  // API path: /api/mobile/users/:id/did
  const { data } = await axios.put(
    `${API_URL}/api/mobile/users/${storedUser._id}/did`,
    { walletAddress },
    config
  );

  // Normalize response
  const updatedUser = data?.user ?? data;
  const flattened = { ...updatedUser, token };
  await persistUser(flattened);

  return flattened;
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
