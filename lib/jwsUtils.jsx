export function b64urlToObj(segment) {
  const pad = segment.length % 4 === 2 ? "==" : segment.length % 4 === 3 ? "=" : "";
  const s = segment.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const json = Buffer.from(s, "base64").toString("utf8");
  return JSON.parse(json);
}

export function decodeJwsPayload(jws) {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWS");
  return b64urlToObj(parts[1]);
}

export function vcTitleFromPayload(payload) {
  const types = Array.isArray(payload?.type) ? payload.type : [];
  const guess = types.find((t) => t !== "VerifiableCredential") || payload?.type || "Credential";
  return String(guess);
}
