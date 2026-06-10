import { create } from "zustand";

interface PdfStore {
  pageCount: number | null;
  setPageCount: (n: number | null) => void;
}

export const usePdfStore = create<PdfStore>((set) => ({
  pageCount: null,
  setPageCount: (pageCount) => set({ pageCount }),
}));
