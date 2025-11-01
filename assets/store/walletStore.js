import { create } from "zustand";
import { loadAllVCs, saveVC } from "../../lib/vcStorage";

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
}));
