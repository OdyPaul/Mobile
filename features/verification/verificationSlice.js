// src/features/verification/verificationSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import verificationService from "../verification/verificationService";

const initialState = {
  request: null,
  requests: [],
  isLoading: false,
  isSuccess: false,
  isError: false,
  message: "",
};

export const createVerificationRequest = createAsyncThunk(
  "verification/create",
  async (data, thunkAPI) => {
    try {
      return await verificationService.createVerificationRequest(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const fetchMyVerificationRequests = createAsyncThunk(
  "verification/fetchMyRequests",
  async (_, thunkAPI) => {
    try {
      return await verificationService.getMyVerificationRequests();
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const verificationSlice = createSlice({
  name: "verification",
  initialState,
  reducers: {
    reset: () => ({ ...initialState }),
    clearError: (state) => {
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // CREATE
      .addCase(createVerificationRequest.pending, (state) => {
        state.isLoading = true;
        state.isSuccess = false;
        state.isError = false;
        state.message = "";
      })
      .addCase(createVerificationRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.request = action.payload;
        // put most-recent first; de-dupe by id if your API returns one
        const id = action.payload?.id || action.payload?._id;
        state.requests = id
          ? [action.payload, ...state.requests.filter((r) => (r.id || r._id) !== id)]
          : [action.payload, ...state.requests];
      })
      .addCase(createVerificationRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message = action.payload || "Failed to create verification request";
      })

      // FETCH MINE
      .addCase(fetchMyVerificationRequests.pending, (state) => {
        state.isLoading = true;
        state.isSuccess = false;
        state.isError = false;
        state.message = "";
      })
      .addCase(fetchMyVerificationRequests.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.requests = Array.isArray(action.payload) ? action.payload : [];
      })
      .addCase(fetchMyVerificationRequests.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.isError = true;
        state.message = action.payload || "Failed to fetch verification requests";
      });
  },
});

export const { reset, clearError } = verificationSlice.actions;
export default verificationSlice.reducer;

// Optional selectors
export const selectVerificationLoading  = (s) => s?.verification?.isLoading;
export const selectVerificationError    = (s) => ({ isError: s?.verification?.isError, message: s?.verification?.message });
export const selectVerificationRequests = (s) => s?.verification?.requests || [];
export const selectCreatedRequest       = (s) => s?.verification?.request;
