// assets/store/walletStore.js
import { create } from "zustand";
import { loadAllVCs, saveVC, deleteVC } from "../../lib/vcStorage"; // ⬅️ add deleteVC

export const useWallet = create((set, get) => ({
  vcs: [],
  load: async () => {
    const all = await loadAllVCs();
    set({ vcs: all });
  },
  add: async (vc) => {
    await saveVC(vc);
    set({ vcs: [vc, ...get().vcs.filter((x) => x.id !== vc.id)] });
  },
  remove: async (id) => {                      // ⬅️ NEW
    await deleteVC(id);
    set({ vcs: get().vcs.filter((x) => x.id !== id) });
  },
}));
