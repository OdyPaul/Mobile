// redux_store/slices/consentModalSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initial = {
  visible: false,
  sessionId: null,
  credentialId: null,
  dismissed: {}, // 👈 remember sessions the user closed/denied
};

const consentModalSlice = createSlice({
  name: 'consentModal',
  initialState: initial,
  reducers: {
    openVerificationModal: (state, action) => {
      const sid = action.payload?.sessionId || null;
      if (sid && state.dismissed[sid]) return; // 👈 don’t reopen if dismissed
      state.visible = true;
      state.sessionId = sid;
      state.credentialId = action.payload?.credentialId || null;
    },
    closeVerificationModal: (state) => {
      state.visible = false;
      state.sessionId = null;
      state.credentialId = null;
    },
    dismissSessionOnce: (state, action) => {
      const sid = action.payload;
      if (sid) state.dismissed[sid] = true;
    },
    resetConsentModal: () => initial,
  },
});

export const {
  openVerificationModal,
  closeVerificationModal,
  dismissSessionOnce,
  resetConsentModal,
} = consentModalSlice.actions;

export default consentModalSlice.reducer;

export const selectConsentModal = (s) => s?.consentModal || initial;
