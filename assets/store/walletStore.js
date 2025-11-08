// assets/store/walletStore.js
import { create } from "zustand";
import { loadAllVCs, saveVC, deleteVC } from "../../lib/vcStorage";

/** tiny helper */
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

/**
 * Decide a stable lookup key to match server rows to local VCs.
 * We prefer vc.digest, else vc.id (many apps store id===digest).
 */
function vcKey(vc) {
  return vc?.digest || vc?.id || null;
}

export const useWallet = create((set, get) => ({
  vcs: [],

  load: async () => {
    const all = await loadAllVCs();
    set({ vcs: all });
  },

  add: async (vc) => {
    // Ensure we have a stable id; if not, default to digest.
    if (!vc.id && vc.digest) vc.id = vc.digest;
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
    if (!apiBase || !authToken) {
      // No server config → nothing to do.
      return { total: 0, updated: 0, reason: "no-server" };
    }

    // Use in-memory list (caller should call .load() once at app start).
    const current = [...(get().vcs || [])];
    const keys = current.map(vcKey).filter(Boolean);
    if (!keys.length) return { total: 0, updated: 0 };

    const byDigest = new Map(); // digest → index in current[]
    current.forEach((vc, idx) => {
      const k = vcKey(vc);
      if (k) byDigest.set(k, idx);
    });

    const bs = Math.max(1, Number(cfg.batchSize || 150));
    const parts = chunk(keys, bs);

    let updated = 0;

    for (const part of parts) {
      let resp;
      try {
        // Prefer digests for lookup (most robust); we send our keys[] as digests.
        resp = await postStatusBatch({ apiBase, authToken, body: { digests: part } });
      } catch {
        // Stop on server error; partial is fine.
        break;
      }

      const rows = Array.isArray(resp?.results) ? resp.results : [];
      for (const r of rows) {
        if (!r || r.notFound) continue;
        const k = r.digest; // server always returns digest
        const idx = byDigest.get(k);
        if (idx == null) continue;

        const local = current[idx] || {};
        const localAnch = local.anchoring || {};
        const remoteAnch = r.anchoring || {};

        // Determine if anything changed (state, tx, batch, proof length, etc.)
        const changed =
          localAnch.state !== remoteAnch.state ||
          localAnch.tx_hash !== remoteAnch.tx_hash ||
          localAnch.batch_id !== remoteAnch.batch_id ||
          (Array.isArray(localAnch.merkle_proof) ? localAnch.merkle_proof.length : 0) !==
            (Array.isArray(remoteAnch.merkle_proof) ? remoteAnch.merkle_proof.length : 0) ||
          (local.claimed_at || null) !== (r.claimed_at || null);

        if (changed) {
          const merged = {
            ...local,
            // keep local id; ensure one exists for storage (fallback to digest)
            id: local.id || r.digest,
            digest: r.digest || local.digest,
            anchoring: { ...localAnch, ...remoteAnch },
            claimed_at: r.claimed_at || local.claimed_at || null,
          };

          try { await saveVC(merged); } catch {}
          current[idx] = merged;
          updated += 1;
        }
      }
    }

    set({ vcs: current });
    return { total: keys.length, updated };
  },
}));
