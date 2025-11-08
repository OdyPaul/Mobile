import axios from "axios";
const API_URL = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000").replace(/\/+$/, "");

const createVcRequest = async ({ type, purpose }, token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.post(`${API_URL}/api/vc-requests`, { type, purpose }, config);
  return data;
};

const getMyVcRequests = async (token) => {
  const config = { headers: { Authorization: `Bearer ${token}` } };
  const { data } = await axios.get(`${API_URL}/api/vc-requests/mine`, config);
  return Array.isArray(data) ? data : [];
};

export default { createVcRequest, getMyVcRequests };
