// features/consent/consentService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../lib";

const ORIGIN = (
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE ||
  process.env.API_BASE_URL ||
  ""
).replace(/\/+$/, "");

const api = axios.create({ baseURL: `${ORIGIN}/api`, timeout: 25_000 });

api.interceptors.request.use(async (config) => {
  try {
    const token =
      (await AsyncStorage.getItem(STORAGE_KEYS.TOKEN)) ||
      (await AsyncStorage.getItem("token")) ||
      (await AsyncStorage.getItem("authToken")); // 👈 extra fallback
    if (token) {
      config.headers = { ...(config.headers || {}), Authorization: `Bearer ${token}` };
    }
  } catch {}
  config.headers = { "Content-Type": "application/json", ...(config.headers || {}) };
  return config;
});


export async function registerPushToken(token) {
  const { data } = await api.post("/push/register", { token });
  return data;
}

export async function getSession(sessionId) {
  const { data } = await api.get(`/verification/session/${encodeURIComponent(sessionId)}`);
  return data;
}

export async function presentDecision(sessionId, body) {
  const { data } = await api.post(
    `/verification/session/${encodeURIComponent(sessionId)}/present`,
    body
  );
  return data;
}

export async function listPendingConsents() {
  const { data } = await api.get("/verification/pending");
  return Array.isArray(data?.items) ? data.items : [];
}

export default { registerPushToken, getSession, presentDecision, listPendingConsents };