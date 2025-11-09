import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import verificationReducer from "../features/verification/verificationSlice";
import VerificationSessionReducer from "../features/session/verificationSessionSlice"
import consentModal  from "./slices/consentModalSlice"
import vcRequestReducer from "../features/vc/vcRequestSlice"
import notifReducer from "../features/notif/notifSlice"
export const store = configureStore({
  reducer: {
    auth: authReducer,
    verification: verificationReducer,
    verificationSession: VerificationSessionReducer,
      consentModal: consentModal,   
      vcRequest: vcRequestReducer,
      notif:notifReducer,
  },
});

export default store;
