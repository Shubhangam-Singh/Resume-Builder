import { create } from "zustand";
import type { AgencyBranding } from "./resume/types";

interface AgencyStore {
  branding: AgencyBranding;
  setBranding: (branding: AgencyBranding) => void;
  removeBranding: () => void;
}

export const useAgencyStore = create<AgencyStore>((set) => ({
  branding: { enabled: false },
  setBranding: (branding) => set({ branding }),
  removeBranding: () => set({ branding: { enabled: false } }),
}));
