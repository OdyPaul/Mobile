// --- Normalizes the verification list response ---
export const normalizeVerificationList = (res) => {
  // If it's already an array, return it; otherwise, check for a .data array
  return Array.isArray(res) ? res : (res && res.data ? res.data : []);
};

// --- Checks if a status string represents a pending state ---
export const isPendingStatus = (status) => {
  const s = (status || "").toLowerCase();
  return s === "pending" || s === "awaiting_approval";
};

// --- Checks if the list has at least one pending request ---
export const hasPending = (list = []) => {
  return list.some((item) => isPendingStatus(item.status));
};
