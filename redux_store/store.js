import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import verificationReducer from "../features/verification/verificationSlice";
import didSliceReducer from "../features/wallet/didSlice"

export const store = configureStore({
  reducer: {
    auth: authReducer,
    verification: verificationReducer,
    did: didSliceReducer,
  },
});

export default store;
