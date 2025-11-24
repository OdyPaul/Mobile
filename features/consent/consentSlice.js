


// features/consent/consentSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import service from "./consentService";
import { addLocalNotification } from "../notif/notifSlice";

/* ---------------- thunks ---------------- */
export const sendPushToken = createAsyncThunk(
  "consent/sendPushToken",
  async (token, thunkAPI) => {
    try { const res = await service.registerPushToken(token); return { token, res }; }
    catch (e) { return thunkAPI.rejectWithValue(e?.response?.data?.message || e?.message || "Failed"); }
  }
);

export const fetchConsentSession = createAsyncThunk(
  "consent/fetchSession",
  async (sessionId, thunkAPI) => {
    try { return await service.getSession(String(sessionId)); }
    catch (e) { return thunkAPI.rejectWithValue(e?.response?.data?.message || e?.message || "Failed"); }
  }
);

export const presentConsentDeny = createAsyncThunk(
  "consent/presentDeny",
  async ({ sessionId, org }, thunkAPI) => {
    try {
      const data = await service.presentDecision(String(sessionId), { decision: "deny" });
      thunkAPI.dispatch(addLocalNotification({
        type: "session_present", title: "Verification denied", desc: org || "",
        status: "denied_by_holder", meta: { sessionId }
      }));
      return data;
    } catch (e) {
      return thunkAPI.rejectWithValue(e?.response?.data?.reason || e?.message || "Failed");
    }
  }
);

export const presentConsentWithCredential = createAsyncThunk(
  "consent/presentWithCredential",
  async ({ sessionId, credential_id, nonce, org }, thunkAPI) => {
    try {
      const data = await service.presentDecision(String(sessionId), { credential_id, nonce: String(nonce || "") });
      thunkAPI.dispatch(addLocalNotification({
        type: "session_present", title: "Credential sent", desc: org || "",
        status: data?.result?.reason || "ok",
        meta: { sessionId, reason: data?.result?.reason, valid: !!data?.result?.valid }
      }));
      return data;
    } catch (e) {
      return thunkAPI.rejectWithValue(e?.response?.data?.reason || e?.message || "Failed");
    }
  }
);

export const fetchPendingConsents = createAsyncThunk(
  "consent/fetchPending",
  async (_, thunkAPI) => {
    try { const items = await service.listPendingConsents(); return items; }
    catch (e) { return thunkAPI.rejectWithValue(e?.message || "Failed"); }
  }
);

/* --------------- slice ------------------ */
const initialState = {
  session: null,
  loading: false,
  submitting: false,
  error: null,

  pending: [],
  pendingLoading: false,
  pendingError: null,

  lastPushToken: null,
  pushError: null,

  // 🔽 NEW: modal plumbing
  modalOpen: false,
  modalPayload: { sessionId: "", nonce: "" },
};

const consentSlice = createSlice({
  name: "consent",
  initialState,
  reducers: {
    openConsentModal(state, action) {
      const { sessionId = "", nonce = "" } = action.payload || {};
      state.modalOpen = true;
      state.modalPayload = { sessionId: String(sessionId || ""), nonce: String(nonce || "") };
      state.session = null; // clear last session; will refetch
      state.error = null;
    },
    closeConsentModal(state) {
      state.modalOpen = false;
      state.modalPayload = { sessionId: "", nonce: "" };
      state.session = null;
      state.error = null;
      state.submitting = false;
      state.loading = false;
    },
  },
  extraReducers: (b) => {
    // push token
    b.addCase(sendPushToken.fulfilled, (s, a) => { s.lastPushToken = a.payload?.token || null; s.pushError = null; });
    b.addCase(sendPushToken.rejected,  (s, a) => { s.pushError = a.payload || a.error?.message || "Failed"; });

    // fetch session
    b.addCase(fetchConsentSession.pending,   (s) => { s.loading = true; s.error = null; });
    b.addCase(fetchConsentSession.fulfilled, (s, a) => { s.loading = false; s.session = a.payload || null; });
    b.addCase(fetchConsentSession.rejected,  (s, a) => { s.loading = false; s.error = a.payload || a.error?.message || "Failed"; });

    // present deny / present with credential
    b.addCase(presentConsentDeny.pending,   (s) => { s.submitting = true; s.error = null; });
    b.addCase(presentConsentDeny.fulfilled, (s) => { s.submitting = false; });
    b.addCase(presentConsentDeny.rejected,  (s, a) => { s.submitting = false; s.error = a.payload || a.error?.message || "Failed"; });

    b.addCase(presentConsentWithCredential.pending,   (s) => { s.submitting = true; s.error = null; });
    b.addCase(presentConsentWithCredential.fulfilled, (s) => { s.submitting = false; });
    b.addCase(presentConsentWithCredential.rejected,  (s, a) => { s.submitting = false; s.error = a.payload || a.error?.message || "Failed"; });

    // pending list
    b.addCase(fetchPendingConsents.pending,   (s) => { s.pendingLoading = true; s.pendingError = null; });
    b.addCase(fetchPendingConsents.fulfilled, (s, a) => { s.pendingLoading = false; s.pending = Array.isArray(a.payload) ? a.payload : []; });
    b.addCase(fetchPendingConsents.rejected,  (s, a) => { s.pendingLoading = false; s.pendingError = a.payload || a.error?.message || "Failed"; });
  },
});

export const { openConsentModal, closeConsentModal } = consentSlice.actions;

/* --------------- selectors --------------- */
export const selectConsentSession     = (s) => s.consent?.session || null;
export const selectConsentLoading     = (s) => !!s.consent?.loading;
export const selectConsentSubmitting  = (s) => !!s.consent?.submitting;
export const selectConsentModalOpen   = (s) => !!s.consent?.modalOpen;
export const selectConsentModalParams = (s) => s.consent?.modalPayload || { sessionId:"", nonce:"" };
export const selectPendingItems       = (s) => s.consent?.pending || [];
export const selectPendingCount       = (s) => (s.consent?.pending || []).length;

export default consentSlice.reducer;
