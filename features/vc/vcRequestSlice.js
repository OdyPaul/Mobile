import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import vcRequestService from "./vcRequestService";

const initialState = {
  items: [],
  created: null,
  isLoading: false,
  isCreating: false,
  isError: false,
  isSuccess: false,
  message: "",
};

export const createVcRequest = createAsyncThunk(
  "vcRequest/create",
  async ({ type, purpose, anchorNow }, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Missing auth token");
      return await vcRequestService.createVcRequest({ type, purpose, anchorNow }, token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || "Request failed"
      );
    }
  }
);

export const getMyVcRequests = createAsyncThunk(
  "vcRequest/mine",
  async (_, thunkAPI) => {
    try {
      const token = thunkAPI.getState()?.auth?.user?.token;
      if (!token) throw new Error("Missing auth token");
      return await vcRequestService.getMyVcRequests(token);
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data?.message || err?.message || "Failed to load"
      );
    }
  }
);

const slice = createSlice({
  name: "vcRequest",
  initialState,
  reducers: {
    resetVcRequests: (s) => {
      s.items = [];
      s.created = null;
      s.isLoading = false;
      s.isCreating = false;
      s.isError = false;
      s.isSuccess = false;
      s.message = "";
    },
  },
  extraReducers: (b) => {
    b
      .addCase(createVcRequest.pending, (s) => {
        s.isCreating = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(createVcRequest.fulfilled, (s, a) => {
        s.isCreating = false;
        s.isSuccess = true;
        s.created = a.payload;
        s.items = [a.payload, ...(s.items || [])];
      })
      .addCase(createVcRequest.rejected, (s, a) => {
        s.isCreating = false;
        s.isError = true;
        s.message = a.payload;
      });

    b
      .addCase(getMyVcRequests.pending, (s) => {
        s.isLoading = true;
        s.isError = false;
        s.message = "";
      })
      .addCase(getMyVcRequests.fulfilled, (s, a) => {
        s.isLoading = false;
        s.isSuccess = true;
        s.items = a.payload || [];
      })
      .addCase(getMyVcRequests.rejected, (s, a) => {
        s.isLoading = false;
        s.isError = true;
        s.message = a.payload;
      });
  },
});

export const { resetVcRequests } = slice.actions;
export default slice.reducer;
