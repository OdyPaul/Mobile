// src/services/verificationService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * API base rules:
 * - EXPO_PUBLIC_API_URL should be your origin, e.g. https://api.example.com (NO trailing slash)
 * - We append "/api" here so callers just use relative paths like "/verification-request".
 */
const ORIGIN = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");
if (!ORIGIN) {
  // Surface a loud error early if misconfigured
  // You can remove this console.error in production if you prefer  
  // eslint-disable-next-line no-console
  console.error("❗ EXPO_PUBLIC_API_URL is not set. Requests will fail.");
}
const BASE_URL = `${ORIGIN}/api`;

// Dedicated axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 25_000,
});

// Attach bearer token (if present) for every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      };
    }
  } catch {
    // ignore token read errors; request proceeds without auth
  }
  // Always JSON unless caller overrides
  config.headers = {
    "Content-Type": "application/json",
    ...(config.headers || {}),
  };
  return config;
});

// Normalize server/client errors into a readable message
function toMessage(err, fallback = "Request failed") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

/**
 * Create a verification request
 * @param {object} data - payload your API expects
 * @returns {Promise<any>}
 */
async function createVerificationRequest(data) {
  try {
    const res = await api.post("/verification-request", data);
    return res.data;
  } catch (err) {
    const msg = toMessage(err, "Something went wrong");
    // eslint-disable-next-line no-console
    console.error("❌ createVerificationRequest:", err?.response?.data || err);
    throw new Error(msg);
  }
}

/**
 * Fetch the current user's verification requests
 * @returns {Promise<any>}
 */
async function getMyVerificationRequests() {
  try {
    const res = await api.get("/verification-request/mine");
    return res.data;
  } catch (err) {
    const msg = toMessage(err, "Failed to fetch verification requests");
    // eslint-disable-next-line no-console
    console.error("❌ getMyVerificationRequests:", err?.response?.data || err);
    throw new Error(msg);
  }
}

export default {
  createVerificationRequest,
  getMyVerificationRequests,
};
