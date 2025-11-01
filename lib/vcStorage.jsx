// lib/vcStorage.js
import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SAFE = /[^A-Za-z0-9_-]/g;
const fileFor = (id) => VC_DIR + String(id).replace(SAFE, "_") + ".json";

const VC_DIR = FileSystem.documentDirectory + "vcs/";
const VC_INDEX = "vcIndex";

export async function ensureDir() {
  const info = await FileSystem.getInfoAsync(VC_DIR);
  if (!info.exists) {
    // NOTE: legacy import keeps this working
    await FileSystem.makeDirectoryAsync(VC_DIR, { intermediates: true });
  }
}

export async function saveVC(vc) {
  await ensureDir();
  await FileSystem.writeAsStringAsync(fileFor(vc.id), JSON.stringify(vc));
  const idx = await listIndex();
  const next = [vc.id, ...idx.filter((x) => x !== vc.id)];
  await AsyncStorage.setItem(VC_INDEX, JSON.stringify(next));
}

export async function listIndex() {
  const x = await AsyncStorage.getItem(VC_INDEX);
  try { return x ? JSON.parse(x) : []; } catch { return []; }
}

export async function readVC(id) {
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
  for (const id of ids) {
    const v = await readVC(id);
    if (v) results.push(v);
  }
  return results;
}
