// src/features/session/verificationSessionSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  presentToSession,
  createVerificationSession,
  tryBuildPayloadBody,
  presentableIdFromVc,
} from '.././session/verificationSessionService';

// ---------- Thunks ----------

// Create a verification session (returns verifyUrl you show as QR)
export const createSession = createAsyncThunk(
  'verificationSession/create',
  /**
   * args: { ttlHours=168, credential_id, apiOverride? }
   */
  async (args, thunkAPI) => {
    try {
      const { ttlHours = 168, credential_id, apiOverride } = args || {};
      const data = await createVerificationSession({ ttlHours, credential_id, apiOverride });
      return data; // { session_id, verifyUrl, expires_at }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Create session failed';
      return thunkAPI.rejectWithValue(msg);
    }
  }
);

// Present: holder confirms (payload) or server verifies by credential_id
export const presentSession = createAsyncThunk(
  'verificationSession/present',
  /**
   * args: { sessionId, vc?, credential_id?, apiOverride? }
   */
  async (args, thunkAPI) => {
    try {
      const { sessionId, vc, credential_id, apiOverride } = args || {};
      if (!sessionId) throw new Error('sessionId is required');

      let body = null;

      // 1) Prefer stateless payload when jws/salt/digest exist
      if (vc) body = tryBuildPayloadBody(vc);

      // 2) Fallback to server-recognizable id from the VC
      if (!body && vc) {
        const derived = presentableIdFromVc(vc);
        if (derived) body = { credential_id: String(derived) };
      }

      // 3) Explicit credential_id still allowed
      if (!body && credential_id) {
        body = { credential_id: String(credential_id) };
      }

      if (!body) throw new Error('No sendable VC: missing payload and credential_id');

      const data = await presentToSession(sessionId, body, apiOverride);
      return { sessionId, apiOverride: apiOverride || null, ...data };
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.reason ||
        e?.message ||
        'Present failed';
      return thunkAPI.rejectWithValue(msg);
    }
  }
);

// ---------- State ----------
const initialState = {
  // create-session
  creating: false,
  createError: null,
  lastSessionId: null,
  verifyUrl: null,
  expiresAt: null,

  // present-session
  submitting: false,
  submitted: false,
  error: null,
  result: null,         // { valid, reason } when available

  lastApiBase: null,    // apiOverride used (if any)
  lastResponse: null,   // raw API response
};

// ---------- Slice ----------
const verificationSessionSlice = createSlice({
  name: 'verificationSession',
  initialState,
  reducers: {
    resetVerificationSession: () => initialState,
    clearVerificationError: (state) => { state.error = null; state.createError = null; },
    clearVerificationResult: (state) => { state.result = null; state.submitted = false; },
  },
  extraReducers: (builder) => {
    builder
      // create-session
      .addCase(createSession.pending, (state) => {
        state.creating = true;
        state.createError = null;
        state.verifyUrl = null;
        state.lastSessionId = null;
        state.expiresAt = null;
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.creating = false;
        state.createError = null;
        state.lastSessionId = action.payload?.session_id || null;
        state.verifyUrl = action.payload?.verifyUrl || null;
        state.expiresAt = action.payload?.expires_at || null;
      })
      .addCase(createSession.rejected, (state, action) => {
        state.creating = false;
        state.createError = action.payload || 'Create session failed';
      })

      // present-session
      .addCase(presentSession.pending, (state) => {
        state.submitting = true;
        state.submitted = false;
        state.error = null;
      })
      .addCase(presentSession.fulfilled, (state, action) => {
        state.submitting = false;
        state.submitted = true;
        state.error = null;
        state.lastSessionId = action.payload?.sessionId || state.lastSessionId;
        state.lastApiBase = action.payload?.apiOverride || null;
        state.lastResponse = action.payload || null;
        state.result = action.payload?.result || null; // may be null if server still pending
      })
      .addCase(presentSession.rejected, (state, action) => {
        state.submitting = false;
        state.submitted = false;
        state.error = action.payload || 'Present failed';
      });
  },
});

export const {
  resetVerificationSession,
  clearVerificationError,
  clearVerificationResult,
} = verificationSessionSlice.actions;

export default verificationSessionSlice.reducer;

// ---------- Selectors ----------
export const selectSessionCreating   = (s) => s?.verificationSession?.creating;
export const selectSessionCreateErr  = (s) => s?.verificationSession?.createError;
export const selectSessionId         = (s) => s?.verificationSession?.lastSessionId;
export const selectSessionVerifyUrl  = (s) => s?.verificationSession?.verifyUrl;
export const selectSessionExpiresAt  = (s) => s?.verificationSession?.expiresAt;

export const selectVerificationSubmitting = (s) => s?.verificationSession?.submitting;
export const selectVerificationSubmitted  = (s) => s?.verificationSession?.submitted;
export const selectVerificationResult     = (s) => s?.verificationSession?.result;
export const selectVerificationError      = (s) => s?.verificationSession?.error;
