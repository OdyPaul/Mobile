import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import verificationReducer from "../features/verification/verificationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    verification: verificationReducer,
  },
});

export default store;
