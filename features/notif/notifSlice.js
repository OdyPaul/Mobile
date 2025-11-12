// features/notif/notifSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  fetchAllNotifications,   // should return newest->oldest or raw arrays we’ll sort
  recordLocalEvent,
  getLastSeenAt,           // <- add these 2 in notifService (shown below)
  setLastSeenAt,
} from "./notifService";

/* ------------------------------ helpers ------------------------------ */
const normalizeTs = (x) => {
  const n = typeof x === "number" ? x : new Date(x).getTime();
  return Number.isFinite(n) ? n : 0;
};
const makeKey = (it) =>
  String(it?.id ?? it?._id ?? `${it?.type ?? "evt"}:${normalizeTs(it?.ts)}`);

// Stable sort desc by ts
const sortDesc = (rows) =>
  rows.slice().sort((a, b) => normalizeTs(b.ts) - normalizeTs(a.ts));

// Dedupe by id/_id/fallback key
const dedupe = (rows) => {
  const seen = new Set();
  const out = [];
  for (const it of rows) {
    const k = makeKey(it);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(it);
    }
  }
  return out;
};

/* ------------------------------ async thunks ------------------------------ */

// Hydrate lastSeenAt from storage on app start
export const hydrateNotifState = createAsyncThunk(
  "notif/hydrate",
  async () => {
    const last = await getLastSeenAt().catch(() => 0);
    return { lastSeenAt: normalizeTs(last) };
  }
);

// Used by Activity & VC screens
export const refreshNotifications = createAsyncThunk(
  "notif/refresh",
  async (_, thunkAPI) => {
    try {
      const rows = await fetchAllNotifications();
      const safe = Array.isArray(rows) ? rows : [];
      return dedupe(sortDesc(safe));
    } catch (e) {
      return thunkAPI.rejectWithValue(e?.message || "Refresh failed");
    }
  }
);

// Mark all as seen now (persist + redux)
export const markAllSeenNow = createAsyncThunk(
  "notif/markAllSeenNow",
  async (_, { getState }) => {
    const now = Date.now();
    await setLastSeenAt(now).catch(() => {});
    return { ts: now };
  }
);

/* ------------------------------- initial state ---------------------------- */

const initialState = {
  items: [],
  loading: false,
  error: null,
  lastSeenAt: 0,
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
      // keep list predictable
      const next = sortDesc([item, ...state.items]);
      state.items = dedupe(next);
    },

    // hard reset list (not typically needed)
    clearNotifications(state) {
      state.items = [];
      state.error = null;
      state.lastSeenAt = 0;
    },

    // replace list wholesale
    setNotifications(state, action) {
      const rows = Array.isArray(action.payload) ? action.payload : [];
      state.items = dedupe(sortDesc(rows));
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateNotifState.fulfilled, (state, action) => {
        state.lastSeenAt = action.payload?.lastSeenAt ?? state.lastSeenAt;
      })
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
      })
      .addCase(markAllSeenNow.fulfilled, (state, action) => {
        state.lastSeenAt = normalizeTs(action.payload?.ts) || Date.now();
      });
  },
});

/* ----------------------------- thunk wrappers ----------------------------- */
export const addLocalNotification =
  (evt) =>
  async (dispatch) => {
    const withTs = { ...evt, ts: normalizeTs(evt?.ts) || Date.now() };
    try { await recordLocalEvent(withTs); } catch {}
    dispatch(notifSlice.actions._pushLocal(withTs));
  };

/* --------------------------------- exports -------------------------------- */
export const { clearNotifications, setNotifications } = notifSlice.actions;

// selectors
export const selectNotifItems   = (s) => s.notif?.items || [];
export const selectNotifLoading = (s) => !!s.notif?.loading;
export const selectLastSeenAt   = (s) => s.notif?.lastSeenAt || 0;
export const selectUnreadCount  = (s) => {
  const last = s.notif?.lastSeenAt || 0;
  const items = s.notif?.items || [];
  let n = 0;
  for (let i = 0; i < items.length; i++) {
    if (normalizeTs(items[i].ts) > last) n++;
    else break; // list is sorted desc; early exit
  }
  return n;
};

export default notifSlice.reducer;
