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

import * as React from "react";
import * as RF from "reactflow";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useDmnDiffStore } from "./store/DmnDiffStore";
import { DmnDiffFileVersion, DiffResult } from "./types";
import { FileUploadArea } from "./components/DmnDiffUploader";
import { DmnDiffChangeList } from "./components/DmnDiffChangeList";
import { DmnEditor, DmnEditorRef } from "../DmnEditor";
import { DiagramRef } from "../diagram/Diagram";
import { getMarshaller } from "@kie-tools/dmn-marshaller";
import { normalize } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import "./UnifiedDiffEditorView.css";

interface ReactFiberNode {
  ref?: { current?: DiagramRef | null };
  stateNode?: DiagramRef | null;
  memoizedProps?: { reactFlowInstance?: RF.ReactFlowInstance };
  return?: ReactFiberNode;
}

interface ElementWithReactFiber extends Element {
  [key: string]: unknown;
}

const ZOOM_LEVELS = {
  NODE: 1.5,
  EDGE: 1.2,
} as const;

const DEFAULT_NODE_DIMENSIONS = {
  WIDTH: 200,
  HEIGHT: 100,
} as const;

export const UnifiedDiffEditorView: React.FC = () => {
  const versionA = useDmnDiffStore((state) => state.versionA);
  const versionB = useDmnDiffStore((state) => state.versionB);
  const isReadyForComparison = useDmnDiffStore((state) => state.isReadyForComparison());

  const [editorRef, setEditorRef] = useState<DmnEditorRef | null>(null);
  const [isDiffListOpen, setIsDiffListOpen] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [isDiffModeEnabled, setIsDiffModeEnabled] = useState(false);

  const model = useMemo(() => {
    if (isReadyForComparison && versionA?.content && versionB?.content) {
      const marshaller = getMarshaller(versionB.content, { upgradeTo: "latest" });
      return normalize(marshaller.parser.parse());
    }
    return undefined;
  }, [isReadyForComparison, versionA?.content, versionB?.content]);

  useEffect(() => {
    if (!model || !editorRef || !versionA?.content || !versionB?.content) {
      return;
    }

    let cancelled = false;

    if (isDiffModeEnabled) {
      editorRef
        .openDiff(versionA.content, versionB.content)
        .then(() => {
          if (!cancelled) {
            setDiffResult(editorRef.getDiffResult());
          }
        })
        .catch(() => {
          if (!cancelled) {
            setDiffResult(null);
          }
        });
    } else {
      editorRef.closeDiff();
      setDiffResult(null);
    }

    return () => {
      cancelled = true;
    };
  }, [model, editorRef, versionA?.content, versionB?.content, isDiffModeEnabled]);

  const handleToggleDiffList = useCallback(() => {
    setIsDiffListOpen((prev) => !prev);
  }, []);

  const evaluationResultsByNodeId = useMemo(() => new Map(), []);
  const validationMessages = useMemo(() => ({}), []);

  return (
    <div className="dmn-unified-diff-view">
      {isReadyForComparison && model ? (
        <>
          <div
            className="dmn-unified-diff-view__viewer-container"
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
          <DmnDiffChangeList
            diffResult={diffResult}
            isOpen={isDiffListOpen}
            onToggle={handleToggleDiffList}
            onItemClick={(elementId, panelWidth) => handleItemClick(elementId, panelWidth)}
            versionA={versionA?.model}
            versionB={versionB?.model}
          />
          {!isDiffListOpen && (
            <div className="dmn-unified-diff-view__toolbar">
              {!isDiffModeEnabled ? (
                <button
                  className="dmn-unified-diff-view__toolbar-button dmn-unified-diff-view__toolbar-button--primary"
                  onClick={() => setIsDiffModeEnabled(true)}
                >
                  Open Diff
                </button>
              ) : (
                <>
                  <button className="dmn-unified-diff-view__toolbar-button" onClick={() => setIsDiffListOpen(true)}>
                    View Changes
                  </button>
                  <div className="dmn-unified-diff-view__toolbar-separator" />
                  <button
                    className="dmn-unified-diff-view__toolbar-button dmn-unified-diff-view__toolbar-button--secondary"
                    onClick={() => {
                      setIsDiffModeEnabled(false);
                      setIsDiffListOpen(false);
                    }}
                  >
                    Close Diff
                  </button>
                </>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="dmn-unified-diff-view__upload-area dmn-unified-diff-view__upload-area--left">
            <div className="dmn-unified-diff-view__upload-overlay">
              <FileUploadArea version={DmnDiffFileVersion.VERSION_A} label="Version 1 (Base)" />
            </div>
          </div>

          <div className="dmn-unified-diff-view__upload-area dmn-unified-diff-view__upload-area--right">
            <div className="dmn-unified-diff-view__upload-overlay">
              <FileUploadArea version={DmnDiffFileVersion.VERSION_B} label="Version 2 (Changed)" />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Helper to find the React instance that has the getReactFlowInstance method
 * Traverses up the React fiber tree from a DOM node to find a component instance
 * that exposes the required method.
 */
function findDiagramInstance(domNode: Element | null): DiagramRef | null {
  if (!domNode) return null;
  const key = Object.keys(domNode).find((k) => k.startsWith("__reactFiber$"));
  if (!key) return null;

  const elementWithFiber = domNode as ElementWithReactFiber;
  let fiber = elementWithFiber[key] as ReactFiberNode | undefined;

  let depth = 0;
  while (fiber && depth < 50) {
    if (fiber.ref?.current?.getReactFlowInstance) {
      return fiber.ref.current;
    }
    if (fiber.stateNode?.getReactFlowInstance) {
      return fiber.stateNode;
    }
    if (fiber.memoizedProps?.reactFlowInstance) {
      return {
        getReactFlowInstance: () => fiber?.memoizedProps!.reactFlowInstance,
      } as DiagramRef;
    }
    fiber = fiber?.return;
    depth++;
  }
  return null;
}

/**
 * Handles logic for zooming to a node or edge when clicked in the diff list
 */
function handleItemClick(elementId: string, panelWidth: number) {
  const diagramContainer = document.querySelector(".kie-tools--dmn-editor--diagram-container");
  const reactFlowWrapper = diagramContainer?.querySelector(".react-flow");
  const diagramInstance = findDiagramInstance(reactFlowWrapper || null);

  if (!diagramInstance) {
    return;
  }

  const rfInstance = diagramInstance.getReactFlowInstance();
  if (!rfInstance) {
    return;
  }

  const idParts = elementId.split("#");
  const cleanId = idParts[idParts.length - 1];
  const normalizedNodeId = `#${cleanId}`;
  const nodes = rfInstance.getNodes();
  const edges = rfInstance.getEdges();
  const node = nodes.find((n) => n.id === normalizedNodeId || n.id === elementId);

  if (node) {
    const centerX = node.position.x + (node.width ?? DEFAULT_NODE_DIMENSIONS.WIDTH) / 2;
    const centerY = node.position.y + (node.height ?? DEFAULT_NODE_DIMENSIONS.HEIGHT) / 2;
    const viewportWidth = window.innerWidth;
    const visibleWidth = viewportWidth - panelWidth;
    const visibleCenterX = panelWidth + visibleWidth / 2;
    const offsetX = (visibleCenterX - viewportWidth / 2) / ZOOM_LEVELS.NODE;
    rfInstance.setCenter(centerX - offsetX, centerY, { duration: 300, zoom: ZOOM_LEVELS.NODE });
    return;
  }

  const edge = edges.find((e) => e.id === cleanId || e.id === elementId || e.id === normalizedNodeId);

  if (edge) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (sourceNode && targetNode) {
      const sourceCenterX = sourceNode.position.x + (sourceNode.width ?? DEFAULT_NODE_DIMENSIONS.WIDTH) / 2;
      const sourceCenterY = sourceNode.position.y + (sourceNode.height ?? DEFAULT_NODE_DIMENSIONS.HEIGHT) / 2;
      const targetCenterX = targetNode.position.x + (targetNode.width ?? DEFAULT_NODE_DIMENSIONS.WIDTH) / 2;
      const targetCenterY = targetNode.position.y + (targetNode.height ?? DEFAULT_NODE_DIMENSIONS.HEIGHT) / 2;
      const centerX = (sourceCenterX + targetCenterX) / 2;
      const centerY = (sourceCenterY + targetCenterY) / 2;
      const viewportWidth = window.innerWidth;
      const visibleWidth = viewportWidth - panelWidth;
      const visibleCenterX = panelWidth + visibleWidth / 2;
      const offsetX = (visibleCenterX - viewportWidth / 2) / ZOOM_LEVELS.EDGE;
      rfInstance.setCenter(centerX - offsetX, centerY, { duration: 300, zoom: ZOOM_LEVELS.EDGE });
    }
  }
}
