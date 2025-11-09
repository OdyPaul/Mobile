// assets/store/walletStore.js
import { create } from "zustand";
import { loadAllVCs, saveVC, deleteVC } from "../../lib/vcStorage";

async function postStatusBatch({ apiBase, authToken, body }) {
  const res = await fetch(`${apiBase}/api/mobile/vc/status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) {
    const msg = json?.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Treat strings like "YUIFPSnG..." as base64url digests
function looksLikeDigest(x) {
  return typeof x === "string" && /^[A-Za-z0-9_-]{32,}$/.test(x);
}

// Optionally: treat hex 0x... as a key-ish id? We’ll rely on vc.key when present.
export const useWallet = create((set, get) => ({
  vcs: [],

  load: async () => {
    const all = await loadAllVCs();
    set({ vcs: all });
  },

  add: async (vc) => {
    if (!vc.id && vc.digest) vc.id = vc.digest; // ensure stable id
    await saveVC(vc);
    set({ vcs: [vc, ...get().vcs.filter((x) => x.id !== vc.id)] });
  },

  remove: async (id) => {
    await deleteVC(id);
    set({ vcs: get().vcs.filter((x) => x.id !== id) });
  },

  /**
   * Sync anchoring info from server and persist locally.
   * cfg = { apiBase, authToken, batchSize?: number }
   * Returns { total, updated }.
   */
  syncAnchoring: async (cfg = {}) => {
    const { apiBase, authToken } = cfg;
    if (!apiBase || !authToken) return { total: 0, updated: 0, reason: "no-server" };

    const current = [...(get().vcs || [])];
    if (!current.length) return { total: 0, updated: 0 };

    // Build maps to find local VCs quickly
    const byDigest = new Map(); // digest or id-as-digest -> idx
    const byKey = new Map();

    current.forEach((vc, idx) => {
      const dig = vc?.digest || (looksLikeDigest(vc?.id) ? vc.id : null);
      if (dig) byDigest.set(dig, idx);
      if (vc?.key) byKey.set(String(vc.key), idx);
    });

    // Build the request pools:
    // - digests[] always preferred; include vc.id if it *looks like* a digest
    // - keys[] only for leftovers that have no digest
    const digestPool = current
      .map((v) => v.digest || (looksLikeDigest(v.id) ? v.id : null))
      .filter(Boolean);

    const keyPool = current
      .filter((v) => !(v.digest || looksLikeDigest(v.id)) && v.key)
      .map((v) => String(v.key));

    const bs = Math.max(1, Number(cfg.batchSize || 150));
    let updated = 0;

    async function applyRows(rows) {
      for (const r of rows) {
        if (!r || r.notFound) continue;

        // Prefer digest mapping; else key
        let idx = null;
        if (r.digest && byDigest.has(r.digest)) {
          idx = byDigest.get(r.digest);
        } else if (r.key && byKey.has(String(r.key))) {
          idx = byKey.get(String(r.key));
        }
        if (idx == null) continue;

        const local = current[idx] || {};
        const localAnch = local.anchoring || {};
        const remoteAnch = r.anchoring || {};

        const changed =
          localAnch.state !== remoteAnch.state ||
          localAnch.tx_hash !== remoteAnch.tx_hash ||
          localAnch.batch_id !== remoteAnch.batch_id ||
          localAnch.chain_id !== remoteAnch.chain_id ||
          (localAnch.anchored_at || null) !== (remoteAnch.anchored_at || null) ||
          (local.claimed_at || null) !== (r.claimed_at || null);

        if (changed) {
          const merged = {
            ...local,
            // Keep existing id; ensure digest is stored if provided
            id: local.id || r.digest || local.key || local.id,
            digest: r.digest || local.digest || null,
            anchoring: { ...localAnch, ...remoteAnch },
            claimed_at: r.claimed_at || local.claimed_at || null,
          };
          try { await saveVC(merged); } catch {}
          current[idx] = merged;
          updated += 1;
        }
      }
    }

    // Query by digests
    for (const part of chunk(digestPool, bs)) {
      try {
        const resp = await postStatusBatch({ apiBase, authToken, body: { digests: part } });
        await applyRows(Array.isArray(resp?.results) ? resp.results : []);
      } catch {
        break;
      }
    }

    // Query by keys (for leftovers)
    for (const part of chunk(keyPool, bs)) {
      try {
        const resp = await postStatusBatch({ apiBase, authToken, body: { keys: part } });
        await applyRows(Array.isArray(resp?.results) ? resp.results : []);
      } catch {
        break;
      }
    }

    set({ vcs: current });
    return { total: digestPool.length + keyPool.length, updated };
  },
}));
