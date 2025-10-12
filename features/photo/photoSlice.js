import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import photoService from './photoService';

const initialState = {
  selfie: null,
  idCard: null,
  isLoading: false,
  isError: false,
  message: '',
};

// Upload selfie
export const uploadSelfie = createAsyncThunk(
  'photos/uploadSelfie',
  async (file, thunkAPI) => {
    try {
      return await photoService.uploadPhoto(file);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

// Upload ID card
export const uploadId = createAsyncThunk(
  'photos/uploadId',
  async (file, thunkAPI) => {
    try {
      return await photoService.uploadPhoto(file);
    } catch (err) {
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message);
    }
  }
);

const photoSlice = createSlice({
  name: 'photo',
  initialState,
  reducers: { reset: (state) => Object.assign(state, initialState) },
  extraReducers: (builder) => {
    builder
      // Selfie
      .addCase(uploadSelfie.pending, (state) => { state.isLoading = true; })
      .addCase(uploadSelfie.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selfie = action.payload; // holds { _id, url }
      })
      .addCase(uploadSelfie.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })

      // ID card
      .addCase(uploadId.pending, (state) => { state.isLoading = true; })
      .addCase(uploadId.fulfilled, (state, action) => {
        state.isLoading = false;
        state.idCard = action.payload; // holds { _id, url }
      })
      .addCase(uploadId.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { reset } = photoSlice.actions;
export default photoSlice.reducer;
