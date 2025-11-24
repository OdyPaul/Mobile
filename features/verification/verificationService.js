// src/services/verificationService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * API base rules:
 * - EXPO_PUBLIC_API_URL can be:
 *   - https://api.example.com
 *   - https://api.example.com/api
 *   (with or without trailing slash)
 */
const RAW_API = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/+$/, "");

if (!RAW_API) {
  // eslint-disable-next-line no-console
  console.error("❗ EXPO_PUBLIC_API_URL is not set. Requests will fail.");
}

// If it already ends with "/api" use as-is; otherwise append "/api"
const BASE_URL = /\/api$/.test(RAW_API) ? RAW_API : `${RAW_API}/api`;

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

/* ============================================================================
   Simple cache for "my verification requests"
   - First successful fetch is saved in memory + AsyncStorage
   - Subsequent calls use the cache unless forceRefresh === true
   ============================================================================ */
const VERI_CACHE_KEY = "@my_verification_requests_v1";

// in-memory cache (cleared on app restart)
let inMemoryVerificationCache = null;

async function readVerificationCache() {
  if (inMemoryVerificationCache) return inMemoryVerificationCache;

  try {
    const raw = await AsyncStorage.getItem(VERI_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    // we just store the raw array; keep it flexible
    if (Array.isArray(parsed)) {
      inMemoryVerificationCache = parsed;
      return parsed;
    }
    if (Array.isArray(parsed.data)) {
      inMemoryVerificationCache = parsed.data;
      return parsed.data;
    }
  } catch {
    // ignore cache read errors
  }

  return null;
}

async function writeVerificationCache(data) {
  inMemoryVerificationCache = data;
  try {
    await AsyncStorage.setItem(VERI_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore write errors; not fatal
  }
}

async function clearVerificationCache() {
  inMemoryVerificationCache = null;
  try {
    await AsyncStorage.removeItem(VERI_CACHE_KEY);
  } catch {
    // ignore
  }
}

/* ============================================================================
   API functions
   ============================================================================ */

/**
 * Create a verification request
 * @param {object} data - payload your API expects
 * @returns {Promise<any>}
 */
async function createVerificationRequest(data) {
  try {
    const res = await api.post("/verification-request", data);

    // New request → invalidate cached list so next read fetches fresh
    await clearVerificationCache();

    return res.data;
  } catch (err) {
    const msg = toMessage(err, "Something went wrong");
    // eslint-disable-next-line no-console
    console.error("❌ createVerificationRequest:", err?.response?.data || err);
    throw new Error(msg);
  }
}

/**
 * Fetch the current user's verification requests.
 *
 * Caching rules:
 * - First call: hits backend, saves to cache
 * - Subsequent calls: return cached data
 * - Pass { forceRefresh: true } to bypass cache and re-fetch
 *
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false]
 * @returns {Promise<any[]>}
 */
async function getMyVerificationRequests(options = {}) {
  const { forceRefresh = false } = options || {};

  try {
    // 1) Try cache first, unless explicitly bypassed
    if (!forceRefresh) {
      const cached = await readVerificationCache();
      if (cached) return cached;
    }

    // 2) No cache (or forced refresh) → hit backend
    const res = await api.get("/verification-request/mine");
    const data = res.data;

    await writeVerificationCache(data);
    return data;
  } catch (err) {
    // 3) On error, if we weren't forcing refresh, try to fall back to cache
    if (!forceRefresh) {
      const cached = await readVerificationCache();
      if (cached) return cached;
    }

    const msg = toMessage(err, "Failed to fetch verification requests");
    // eslint-disable-next-line no-console
    console.error("❌ getMyVerificationRequests:", err?.response?.data || err);
    throw new Error(msg);
  }
}

export default {
  createVerificationRequest,
  getMyVerificationRequests,
  clearVerificationCache,
};
