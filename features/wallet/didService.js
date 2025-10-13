import axios from "axios";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// 🪪 Update user DID (wallet address)
const updateWalletDID = async (userId, walletAddress, token) => {
  if (!token) throw new Error("Missing auth token");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  const { data } = await axios.put(
    `${API_URL}/api/mobile/${userId}/did`,
    { walletAddress },
    config
  );

  return data.user; // backend returns { message, user }
};

// ✅ Correct export — not nested, not default-wrapped incorrectly
export default {
  updateWalletDID,
};
