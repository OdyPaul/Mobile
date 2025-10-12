// features/verification/verificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

const initialState = {
  request: null,
  requests: [],
  isLoading: false,
  isError: false,
  message: "",
};

export const createVerificationRequest = createAsyncThunk(
  "verification/create",
  async (data, thunkAPI) => {
    try {
      // ✅ Grab token from Redux auth slice
      const token = thunkAPI.getState().auth.user?.token;
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // ✅ Send to backend
      const response = await axios.post(
        `${API_URL}/api/verification-request`,
        data,
        config
      );

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message || "Something went wrong"
      );
    }
  }
);

const verificationSlice = createSlice({
  name: "verification",
  initialState,
  reducers: {
    reset: (state) => Object.assign(state, initialState),
  },
  extraReducers: (builder) => {
    builder
      .addCase(createVerificationRequest.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createVerificationRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.request = action.payload;
        state.requests.push(action.payload);
      })
      .addCase(createVerificationRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = verificationSlice.actions;
export default verificationSlice.reducer;
