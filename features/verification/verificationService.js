// services/verificationService.js
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Optional: quick guard to catch missing API base early
function assertApiUrl() {
  if (!API_URL || typeof API_URL !== "string") {
    throw new Error("EXPO_PUBLIC_API_URL is not set");
  }
}

const createVerificationRequest = async (data) => {
  try {
    assertApiUrl();

    const token = await AsyncStorage.getItem("token");
    const url = `${API_URL.replace(/\/$/, "")}/api/verification-request`;

    // Avoid Axios auto-JSON parsing, handle it ourselves
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${token || ""}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      transformResponse: [(raw) => raw], // <- DO NOT auto-parse
      validateStatus: (s) => s < 500,   // treat 4xx as "handled" so we can read body
    });

    let body = response.data;

    // If server returned a JSON string, try parse; otherwise keep as text
    if (typeof body === "string") {
      const trimmed = body.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          body = JSON.parse(trimmed);
        } catch (e) {
          // JSON parse failed — surface raw text
          console.error("⚠️ Server returned invalid JSON. Raw body:", body);
          throw new Error("Server returned invalid JSON");
        }
      }
    }

    // Handle 4xx with message if present
    if (response.status >= 400) {
      const msg =
        (body && typeof body === "object" && (body.message || body.error)) ||
        (typeof body === "string" ? body.slice(0, 300) : `Request failed (${response.status})`);
      throw new Error(msg);
    }

    // Success — return parsed object or plain text
    return body;
  } catch (error) {
    // Prefer server message if axios wrapped the error
    const msg =
      error?.message ||
      error?.response?.data?.message ||
      "Something went wrong creating verification request";
    console.error("❌ createVerificationRequest error:", msg);
    throw new Error(msg);
  }
};

export default { createVerificationRequest };
