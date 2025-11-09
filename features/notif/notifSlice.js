// features/notif/notifSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchAllNotifications, recordLocalEvent } from "./notifService";

/* ------------------------------ async thunks ------------------------------ */

// Used by Activity & VC screens
export const refreshNotifications = createAsyncThunk(
  "notif/refresh",
  async (_, thunkAPI) => {
    try {
      const rows = await fetchAllNotifications();
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      return thunkAPI.rejectWithValue(e?.message || "Refresh failed");
    }
  }
);

/* ------------------------------- initial state ---------------------------- */

const initialState = {
  items: [],        // flattened activity items
  loading: false,   // fetch spinner
  error: null,      // last error string
  lastSeenAt: 0,    // timestamp when user last marked read
};

/* ---------------------------------- slice --------------------------------- */

const notifSlice = createSlice({
  name: "notif",
  initialState,
  reducers: {
    // internal: push a single local item into state (newest-first)
    _pushLocal(state, action) {
      const item = action.payload;
      if (!item) return;
      state.items.unshift(item);
    },

    // mark everything as seen "now"
    markAllSeen(state) {
      state.lastSeenAt = Date.now();
    },

    // hard reset list (not typically needed)
    clearNotifications(state) {
      state.items = [];
      state.error = null;
      state.lastSeenAt = 0;
    },

    // replace list wholesale
    setNotifications(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(refreshNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(refreshNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || action.error?.message || "Refresh failed";
      });
  },
});

/* ----------------------------- thunk wrappers ----------------------------- */
/** Public thunk so callers can `dispatch(addLocalNotification(evt))`
 *  – persists to local storage AND updates Redux state. */
export const addLocalNotification =
  (evt) =>
  async (dispatch) => {
    const withTs = { ...evt, ts: evt?.ts || Date.now() };
    try {
      // Persist for notifService.fetchAllNotifications() to read later
      await recordLocalEvent(withTs);
    } catch {
      // best-effort; don't block UI
    }
    // Reflect immediately in UI
    dispatch(notifSlice.actions._pushLocal(withTs));
  };

/* --------------------------------- exports -------------------------------- */

export const { markAllSeen, clearNotifications, setNotifications } =
  notifSlice.actions;

// selectors used by Activity screen
export const selectNotifItems = (s) => s.notif?.items || [];
export const selectNotifLoading = (s) => !!s.notif?.loading;

export default notifSlice.reducer;
