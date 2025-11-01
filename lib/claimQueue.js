// mobile/lib/claimQueue.js
import AsyncStorage from "@react-native-async-storage/async-storage";

// Local queue (offline safe)
const LOCAL_KEY = "claimQueueV1";

async function localLoad() {
  try { const s = await AsyncStorage.getItem(LOCAL_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
async function localSave(arr) {
  try { await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(arr || [])); } catch {}
}
export async function enqueueClaimLocal(ticket) {
  const now = Date.now();
  const t = {
    token: String(ticket.token || "").trim(),
    url: String(ticket.url || "").trim(),
    exp: ticket.exp || null,
    savedAt: ticket.savedAt || now,
  };
  if (!t.token || !t.url) return;
  const q = await localLoad();
  const next = [t, ...q.filter((x) => x.token !== t.token)];
  await localSave(next);
}
export async function removeClaimLocal(token) {
  const q = await localLoad();
  await localSave(q.filter((x) => x.token !== token));
}

// ---- server helpers (optional) ----
async function serverFetch(path, { apiBase, authToken, method = "GET", body } = {}) {
  if (!apiBase || !authToken) {
    const err = new Error("server config missing");
    err.code = "NO_SERVER";
    throw err;
  }
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const err = new Error(json?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

export async function enqueueClaimServer({ token, url, expires_at }, cfg) {
  return serverFetch(`/api/mobile/claim-queue/enqueue`, {
    ...cfg, method: "POST", body: { token, url, expires_at }
  });
}
export async function enqueueBatchServer(items, cfg) {
  return serverFetch(`/api/mobile/claim-queue/enqueue-batch`, {
    ...cfg, method: "POST", body: { items }
  });
}
export async function listServer(cfg) {
  return serverFetch(`/api/mobile/claim-queue`, { ...cfg, method: "GET" });
}
export async function redeemAllServer(cfg) {
  return serverFetch(`/api/mobile/claim-queue/redeem-all`, { ...cfg, method: "POST" });
}

// ---- high-level flows ----
export async function enqueueClaim(ticket, cfg) {
  await enqueueClaimLocal(ticket);
  try {
    if (cfg?.apiBase && cfg?.authToken) {
      await enqueueClaimServer(
        {
          token: ticket.token,
          url: ticket.url,
          expires_at: ticket.exp ? new Date(ticket.exp).toISOString() : undefined,
        },
        cfg
      );
    }
  } catch {
    // ignore — offline/local always present
  }
}

/**
 * Redeem everything:
 *   1) Try server queue first (preferred, binds holder).
 *   2) If that fails entirely, redeem each local item directly via its public URL.
 * onVC(payload) must store the VC.
 */
export async function redeemAll(onVC, cfg) {
  let serverOk = false;

  if (cfg?.apiBase && cfg?.authToken) {
    try {
      const r = await redeemAllServer(cfg); // { count, results: [{ token, ok, payload? }] }
      for (const item of (r?.results || [])) {
        if (item.ok && item.payload?.jws) {
          await onVC?.(item.payload);
          await removeClaimLocal(item.token);
        }
      }
      serverOk = true;
    } catch {
      serverOk = false; // fall back to local direct
    }
  }

  if (!serverOk) {
    const q = await localLoad();
    const results = [];
    for (const t of q) {
      try {
        const res = await fetch(t.url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (payload?.jws) {
          await onVC?.(payload);
          await removeClaimLocal(t.token);
          results.push({ token: t.token, ok: true });
        } else {
          results.push({ token: t.token, ok: false, error: "no jws" });
        }
      } catch (e) {
        results.push({ token: t.token, ok: false, error: String(e?.message || e) });
      }
    }
    return results;
  }
  return [];
}

/**
 * Convenience: enqueue locally (+ server if cfg provided) and then immediately try to redeem.
 * Returns { ok: true } if at least one VC redeemed, else { ok:false, error:'...' }.
 */
export async function addTicketAndTryRedeem(ticket, onVC, cfg) {
  await enqueueClaim(ticket, cfg);
  const res = await redeemAll(onVC, cfg); // [] on server path success
  const anyOk = Array.isArray(res) ? res.some((r) => r.ok) : true;
  return anyOk ? { ok: true } : { ok: false, error: "redeem deferred" };
}
