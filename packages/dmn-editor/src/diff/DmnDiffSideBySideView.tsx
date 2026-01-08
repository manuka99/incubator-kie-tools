/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import * as React from "react";
import { DmnDiffViewer } from "./components/DmnDiffViewer";
import { FileUploadArea } from "./components/DmnDiffUploader";
import { DmnDiffFileVersion } from "./types";
import { useDmnDiffStore } from "./store/DmnDiffStore";
import "./DmnDiffSideBySideView.css";

export const DmnDiffSideBySideView: React.FC = () => {
  const isReadyForComparison = useDmnDiffStore(
    (state) =>
      state.versionA !== null &&
      state.versionB !== null &&
      state.versionAError === null &&
      state.versionBError === null &&
      !state.isLoadingA &&
      !state.isLoadingB
  );

  return (
    <div className="dmn-diff-side-by-side-view">
      {isReadyForComparison && (
        <div className="dmn-diff-side-by-side-view__viewer-container">
          <DmnDiffViewer />
        </div>
      )}

      <div className="dmn-diff-side-by-side-view__upload-area dmn-diff-side-by-side-view__upload-area--left">
        <div className="dmn-diff-side-by-side-view__upload-overlay">
          <FileUploadArea version={DmnDiffFileVersion.VERSION_A} label="Version A" />
        </div>
      </div>

      <div className="dmn-diff-side-by-side-view__upload-area dmn-diff-side-by-side-view__upload-area--right">
        <div className="dmn-diff-side-by-side-view__upload-overlay">
          <FileUploadArea version={DmnDiffFileVersion.VERSION_B} label="Version B" />
        </div>
      </div>
    </div>
  );
};
