import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";
import authService from "./authService"; // make sure this exists

// -----------------------------------------------------------------------------
// Load user from AsyncStorage
// -----------------------------------------------------------------------------
let initialUser = null;
(async () => {
  const storedUser = await AsyncStorage.getItem("user");
  if (storedUser) initialUser = JSON.parse(storedUser);
})();

const initialState = {
  user: initialUser,
  isError: false,
  isSuccess: false,
  isLoading: false,
  message: "",
};

// -----------------------------------------------------------------------------
// Register User
// -----------------------------------------------------------------------------
export const register = createAsyncThunk(
  "auth/register",
  async (user, thunkAPI) => {
    try {
      const response = await authService.register(user);
      if (response) {
        await AsyncStorage.setItem("user", JSON.stringify(response));
      }
      return response;
    } catch (error) {
      const message =
        (error.response?.data?.message || error.message || "Registration failed");
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// -----------------------------------------------------------------------------
// Login User
// -----------------------------------------------------------------------------
export const login = createAsyncThunk(
  "auth/login",
  async (user, thunkAPI) => {
    try {
      const response = await authService.login(user);
      if (response) {
        await AsyncStorage.setItem("user", JSON.stringify(response));
      }
      return response;
    } catch (error) {
      const message =
        error.response?.data?.message || error.message || "Login failed";
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// -----------------------------------------------------------------------------
// Logout
// -----------------------------------------------------------------------------
export const logout = createAsyncThunk("auth/logout", async () => {
  await AsyncStorage.removeItem("user");
  return null;
});

// -----------------------------------------------------------------------------
// Slice
// -----------------------------------------------------------------------------
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
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
      })
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
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
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
