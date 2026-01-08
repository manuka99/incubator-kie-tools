/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useDmnDiffStore } from "./store/DmnDiffStore";
import { DmnDiffFileVersion, DiffResult } from "./types";
import { FileUploadArea } from "./components/DmnDiffUploader";
import { DmnDiffChangeList_v2 } from "./components/DmnDiffChangeList_v2";
import { DmnEditor, DmnEditorRef } from "../DmnEditor";
import { getMarshaller } from "@kie-tools/dmn-marshaller";
import { normalize } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import "./DmnDiffSideBySideView.css";

export const UnifiedDiffEditorView: React.FC = () => {
  const versionA = useDmnDiffStore((state) => state.versionA);
  const versionB = useDmnDiffStore((state) => state.versionB);
  const isReadyForComparison = useDmnDiffStore((state) => state.isReadyForComparison());

  const [editorRef, setEditorRef] = useState<DmnEditorRef | null>(null);
  const [isDiffListOpen, setIsDiffListOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);

  const model = useMemo(() => {
    if (isReadyForComparison && versionA?.content && versionB?.content) {
      const marshaller = getMarshaller(versionB.content, { upgradeTo: "latest" });
      return normalize(marshaller.parser.parse());
    }
    return undefined;
  }, [isReadyForComparison, versionA?.content, versionB?.content]);

  useEffect(() => {
    if (model && editorRef && versionA?.content && versionB?.content) {
      editorRef.openDiff(versionA.content, versionB.content).then(() => {
        setDiffResult(editorRef.getDiffResult());
      });
    }
  }, [model, editorRef, versionA?.content, versionB?.content]);

  const handleToggleDiffList = useCallback(() => {
    setIsDiffListOpen((prev) => !prev);
  }, []);

  const evaluationResultsByNodeId = useMemo(() => new Map(), []);
  const validationMessages = useMemo(() => ({}), []);

  return (
    <div className="dmn-diff-side-by-side-view">
      {isReadyForComparison && model ? (
        <>
          <div
            className="dmn-diff-side-by-side-view__viewer-container"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          >
            <DmnEditor
              ref={setEditorRef}
              model={model}
              originalVersion="1.5"
              evaluationResultsByNodeId={evaluationResultsByNodeId}
              validationMessages={validationMessages}
              isReadOnly={true}
              locale="en"
            />
          </div>
          <DmnDiffChangeList_v2
            diffResult={diffResult}
            isOpen={isDiffListOpen}
            onToggle={handleToggleDiffList}
            versionA={versionA?.model}
            versionB={versionB?.model}
          />
        </>
      ) : (
        <>
          <div className="dmn-diff-side-by-side-view__upload-area dmn-diff-side-by-side-view__upload-area--left">
            <div className="dmn-diff-side-by-side-view__upload-overlay">
              <FileUploadArea version={DmnDiffFileVersion.VERSION_A} label="Version 1 (Base)" />
            </div>
          </div>

          <div className="dmn-diff-side-by-side-view__upload-area dmn-diff-side-by-side-view__upload-area--right">
            <div className="dmn-diff-side-by-side-view__upload-overlay">
              <FileUploadArea version={DmnDiffFileVersion.VERSION_B} label="Version 2 (Changed)" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
