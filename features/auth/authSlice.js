// features/auth/authSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authService from "./authService";

// --- Hydrate from storage on app start ---
export const hydrateAuth = createAsyncThunk("auth/hydrate", async () => {
  const stored = await AsyncStorage.getItem("user");
  return stored ? JSON.parse(stored) : null;
});

// --- Register ---
export const register = createAsyncThunk("auth/register", async (user, thunkAPI) => {
  try {
    const data = await authService.register(user); // expects { username, email, password, otpSession }
    await AsyncStorage.setItem("user", JSON.stringify(data));
    return data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Registration failed";
    return thunkAPI.rejectWithValue(message);
  }
});

// --- Login ---
export const login = createAsyncThunk("auth/login", async (user, thunkAPI) => {
  try {
    const data = await authService.login(user);
    await AsyncStorage.setItem("user", JSON.stringify(data));
    return data;
  } catch (error) {
    const message = error.response?.data?.message || error.message || "Login failed";
    return thunkAPI.rejectWithValue(message);
  }
});

// --- Logout ---
export const logout = createAsyncThunk("auth/logout", async () => {
  try {
    const biometrics = await AsyncStorage.getItem("@biometric_pref");
    const savedEmail = await AsyncStorage.getItem("@saved_email");
    const savedPassword = await AsyncStorage.getItem("@saved_password");

    await AsyncStorage.multiRemove(["user", "token"]);
    await authService.logout();

    if (biometrics !== null) await AsyncStorage.setItem("@biometric_pref", biometrics);
    if (savedEmail && savedPassword) {
      await AsyncStorage.setItem("@saved_email", savedEmail);
      await AsyncStorage.setItem("@saved_password", savedPassword);
    }

    return null;
  } catch {
    return null;
  }
});

const initialState = {
  user: null,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isSuccess = false;
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // Hydrate
      .addCase(hydrateAuth.pending, (state) => { state.isLoading = true; })
      .addCase(hydrateAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(hydrateAuth.rejected, (state) => { state.isLoading = false; })

      // Register
      .addCase(register.pending, (state) => { state.isLoading = true; })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })

      // Login
      .addCase(login.pending, (state) => { state.isLoading = true; })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
        state.user = null;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;
