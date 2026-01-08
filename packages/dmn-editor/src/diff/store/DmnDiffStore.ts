/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { DmnDiffState, DmnDiffFileVersion, DiffResult } from "../types";
import { validateDmnFile } from "../validation";
import { computeDmnDiff } from "../algorithms/dmnDiffAlgorithm";

interface DmnDiffStore extends DmnDiffState {
  // State
  diffResult: DiffResult | null;
  isChangeListOpen: boolean;

  // Actions
  setFile: (version: DmnDiffFileVersion, file: File) => Promise<void>;
  clearFile: (version: DmnDiffFileVersion) => void;
  resetAll: () => void;
  toggleChangeList: () => void;

  // Computed
  isReadyForComparison: () => boolean;
  canClearVersionA: () => boolean;
  canClearVersionB: () => boolean;
  getDiffResult: () => DiffResult | null;
}

const initialState: DmnDiffState = {
  versionA: null,
  versionB: null,
  versionAError: null,
  versionBError: null,
  isLoadingA: false,
  isLoadingB: false,
};

const initialStoreState = {
  ...initialState,
  diffResult: null as DiffResult | null,
  isChangeListOpen: false,
};

export const useDmnDiffStore = create<DmnDiffStore>()(
  immer((set, get) => ({
    ...initialStoreState,

    setFile: async (version: DmnDiffFileVersion, file: File) => {
      // Set loading state
      if (version === DmnDiffFileVersion.VERSION_A) {
        set((state) => {
          state.isLoadingA = true;
          state.versionAError = null;
        });
      } else {
        set((state) => {
          state.isLoadingB = true;
          state.versionBError = null;
        });
      }

      // Validate and parse the file
      const { file: dmnFile, error } = await validateDmnFile(file);

      // Update state with result
      if (version === DmnDiffFileVersion.VERSION_A) {
        set((state) => {
          state.versionA = dmnFile;
          state.versionAError = error;
          state.isLoadingA = false;
        });
      } else {
        set((state) => {
          state.versionB = dmnFile;
          state.versionBError = error;
          state.isLoadingB = false;
        });
      }

      // Compute diff if both files are ready
      const state = get();
      if (state.versionA?.model && state.versionB?.model && !state.versionAError && !state.versionBError) {
        set((state) => {
          state.diffResult = computeDmnDiff(state.versionA!.model, state.versionB!.model);
        });
      } else {
        set((state) => {
          state.diffResult = null;
        });
      }
    },

    clearFile: (version: DmnDiffFileVersion) => {
      if (version === DmnDiffFileVersion.VERSION_A) {
        set((state) => {
          state.versionA = null;
          state.versionAError = null;
          state.isLoadingA = false;
        });
      } else {
        set((state) => {
          state.versionB = null;
          state.versionBError = null;
          state.isLoadingB = false;
        });
      }

      // Recompute diff if both files are still ready
      const state = get();
      if (state.versionA?.model && state.versionB?.model && !state.versionAError && !state.versionBError) {
        set((state) => {
          state.diffResult = computeDmnDiff(state.versionA!.model, state.versionB!.model);
        });
      } else {
        set((state) => {
          state.diffResult = null;
        });
      }
    },

    resetAll: () => {
      set(initialStoreState);
    },

    toggleChangeList: () => {
      set((state) => {
        state.isChangeListOpen = !state.isChangeListOpen;
      });
    },

    isReadyForComparison: () => {
      const state = get();
      return (
        state.versionA !== null &&
        state.versionB !== null &&
        state.versionAError === null &&
        state.versionBError === null &&
        !state.isLoadingA &&
        !state.isLoadingB
      );
    },

    canClearVersionA: () => {
      const state = get();
      return state.versionA !== null || state.versionAError !== null;
    },

    canClearVersionB: () => {
      const state = get();
      return state.versionB !== null || state.versionBError !== null;
    },

    getDiffResult: () => {
      const state = get();
      return state.diffResult;
    },
  }))
);
