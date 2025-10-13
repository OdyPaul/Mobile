import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import verificationService from ".././verification/verificationService";

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
      return await verificationService.createVerificationRequest(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
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
