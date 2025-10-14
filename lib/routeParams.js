// app/lib/routeParams.js
export const serializeParam = (obj) => {
  try {
    return encodeURIComponent(JSON.stringify(obj ?? {}));
  } catch {
    // Fall back to string
    return encodeURIComponent(String(obj ?? ""));
  }
};

// Accepts raw values from useLocalSearchParams()
export const deserializeParam = (raw) => {
  if (raw == null) return {};
  if (Array.isArray(raw)) return deserializeParam(raw[0]); // take first if array
  if (typeof raw === "object") return raw;                 // already an object

  const str = String(raw);
  // 1) Try plain JSON
  try { return JSON.parse(str); } catch {}
  // 2) Try decoded once, then parse
  try { return JSON.parse(decodeURIComponent(str)); } catch {}

  console.warn("Could not parse route param:", raw);
  return {};
};

// For plain strings like file URIs or idType
export const decodeMaybeString = (raw) => {
  if (raw == null) return raw;
  if (Array.isArray(raw)) return decodeMaybeString(raw[0]);
  try { return decodeURIComponent(String(raw)); } catch { return String(raw); }
};
