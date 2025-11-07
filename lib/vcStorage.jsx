// lib/vcStorage.js
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ---------- Paths / helpers ----------
const SAFE = /[^A-Za-z0-9_-]/g;
const VC_DIR = FileSystem.documentDirectory + "vcs/";
const VC_INDEX = "vcIndex";

const fileFor = (id) => VC_DIR + String(id).replace(SAFE, "_") + ".json";

async function writeIndex(ids) {
  await AsyncStorage.setItem(VC_INDEX, JSON.stringify(ids || []));
}

// ---------- Directory ----------
export async function ensureDir() {
  const info = await FileSystem.getInfoAsync(VC_DIR);
  if (!info.exists) {
    // NOTE: legacy import keeps this working
    await FileSystem.makeDirectoryAsync(VC_DIR, { intermediates: true });
  }
}

// ---------- Index ops ----------
export async function listIndex() {
  const x = await AsyncStorage.getItem(VC_INDEX);
  try {
    const arr = x ? JSON.parse(x) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

// ---------- CRUD ----------
export async function saveVC(vc) {
  if (!vc || !vc.id) throw new Error("saveVC: missing vc.id");
  await ensureDir();

  await FileSystem.writeAsStringAsync(fileFor(vc.id), JSON.stringify(vc));

  // move id to front of index (dedup)
  const idx = await listIndex();
  const next = [vc.id, ...idx.filter((x) => x !== vc.id)];
  await writeIndex(next);
}

export async function readVC(id) {
  if (!id) return null;
  try {
    const s = await FileSystem.readAsStringAsync(fileFor(id));
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export async function loadAllVCs() {
  const ids = await listIndex();
  const results = [];
  const keepIds = [];

  for (const id of ids) {
    try {
      const s = await FileSystem.readAsStringAsync(fileFor(id));
      const v = JSON.parse(s);
      results.push(v);
      keepIds.push(id);
    } catch {
      // file missing or invalid → drop from index
    }
  }

  // If we pruned anything, persist the cleaned index.
  if (keepIds.length !== ids.length) {
    await writeIndex(keepIds);
  }

  return results;
}

// NEW: delete a VC (file + index)
export async function deleteVC(id) {
  if (!id) return;

  // Remove file (idempotent delete)
  try {
    const uri = fileFor(id);
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (e) {
    // swallow file delete errors; we'll still fix the index
    console.warn("deleteVC file error:", e?.message || e);
  }

  // Remove from index
  try {
    const idx = await listIndex();
    const next = idx.filter((x) => x !== id);
    if (next.length !== idx.length) {
      await writeIndex(next);
    }
  } catch (e) {
    console.warn("deleteVC index error:", e?.message || e);
  }
}
