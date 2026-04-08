import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VideoResolution = "480p" | "720p";
export type VideoDuration = 5 | 8;
export type VideoQuantity = 1 | 2 | 3 | 4;

interface PreferenceStore {
  // Video generation preferences
  resolution: VideoResolution;
  duration: VideoDuration;
  quantity: VideoQuantity;
  setResolution: (resolution: VideoResolution) => void;
  setDuration: (duration: VideoDuration) => void;
  setQuantity: (quantity: VideoQuantity) => void;
}

export const usePreferenceStore = create<PreferenceStore>()(
  persist(
    (set) => ({
      resolution: "480p",
      duration: 5,
      quantity: 1,

      setResolution: (resolution: VideoResolution) => {
        set({ resolution });
      },
      setDuration: (duration: VideoDuration) => {
        set({ duration });
      },
      setQuantity: (quantity: VideoQuantity) => {
        set({ quantity });
      },
    }),
    {
      name: "app-preferences",
    }
  )
);

