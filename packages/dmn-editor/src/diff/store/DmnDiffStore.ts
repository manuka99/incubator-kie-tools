/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { DmnDiffState, DmnDiffFileVersion } from "../types";
import { validateDmnFile } from "../validation";

interface DmnDiffStore extends DmnDiffState {
  // Actions
  setFile: (version: DmnDiffFileVersion, file: File) => Promise<void>;
  clearFile: (version: DmnDiffFileVersion) => void;
  resetAll: () => void;

  // Computed
  isReadyForComparison: () => boolean;
  canClearVersionA: () => boolean;
  canClearVersionB: () => boolean;
}

const initialState: DmnDiffState = {
  versionA: null,
  versionB: null,
  versionAError: null,
  versionBError: null,
  isLoadingA: false,
  isLoadingB: false,
};

export const useDmnDiffStore = create<DmnDiffStore>()(
  immer((set, get) => ({
    ...initialState,

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
    },

    resetAll: () => {
      set(initialState);
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
  }))
);
