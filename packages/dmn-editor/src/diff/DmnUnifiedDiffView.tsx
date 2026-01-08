/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import * as React from "react";
import { DmnUnifiedDiffViewer } from "./components/DmnUnifiedDiffViewer";
import { FileUploadArea } from "./components/DmnDiffUploader";
import { DmnDiffFileVersion } from "./types";
import { useDmnDiffStore } from "./store/DmnDiffStore";
import "./DmnDiffSideBySideView.css";

export const DmnUnifiedDiffView: React.FC = () => {
  const { isReadyForComparison, versionA, versionB, diffResult } = useDmnDiffStore((state) => ({
    isReadyForComparison:
      state.versionA !== null &&
      state.versionB !== null &&
      state.versionAError === null &&
      state.versionBError === null &&
      !state.isLoadingA &&
      !state.isLoadingB,
    versionA: state.versionA,
    versionB: state.versionB,
    diffResult: state.diffResult,
  }));

  return (
    <div className="dmn-diff-side-by-side-view">
      {isReadyForComparison && versionA?.model && versionB?.model && diffResult && (
        <div className="dmn-diff-side-by-side-view__viewer-container">
          <DmnUnifiedDiffViewer modelA={versionA.model} modelB={versionB.model} diffResult={diffResult} />
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
