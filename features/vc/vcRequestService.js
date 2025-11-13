import axios from "axios";
const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

// Now accepts anchorNow (boolean)
const createVcRequest = async ({ type, purpose, anchorNow }, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };

  const payload = { type, purpose };
  if (typeof anchorNow === "boolean") {
    payload.anchorNow = anchorNow;
  }

  const { data } = await axios.post(`${API_URL}/api/vc-requests`, payload, config);
  return data;
};

const getMyVcRequests = async (token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.get(`${API_URL}/api/vc-requests/mine`, config);
  return Array.isArray(data) ? data : [];
};

export default { createVcRequest, getMyVcRequests };
