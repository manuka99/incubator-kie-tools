/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import { useCallback } from "react";
import { DmnLatestModel, getMarshaller } from "@kie-tools/dmn-marshaller";
import { normalize, Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { useDmnEditorStoreApi } from "../../store/StoreContext";
import { computeDmnDiff } from "../algorithms/dmnDiffAlgorithm";
import { mergeModels } from "../algorithms/mergeModels";
import { DiffChangeType } from "../types";
import { parseXmlHref, buildXmlHref } from "@kie-tools/dmn-marshaller/dist/xml";

export function useDmnDiffController() {
  const dmnEditorStoreApi = useDmnEditorStoreApi();

  const updateStateWithDiff = useCallback(
    (baseModel: Normalized<DmnLatestModel>, changedModel: Normalized<DmnLatestModel>) => {
      const diffResult = computeDmnDiff(baseModel, changedModel);
      const mergedModel = mergeModels(baseModel, changedModel, diffResult);

      // Compute diff maps for highlighting
      const diffsByNodeId = new Map<string, DiffChangeType>();
      const diffsByEdgeId = new Map<string, DiffChangeType>();
      const deletedNodeIds = new Set<string>();

      for (const nodeDiff of diffResult.nodes) {
        const parsed = parseXmlHref(nodeDiff.id);
        const normalizedId =
          !parsed.namespace || parsed.namespace === baseModel.definitions["@_namespace"]
            ? buildXmlHref({ id: parsed.id })
            : buildXmlHref({ namespace: parsed.namespace, id: parsed.id });
        if (normalizedId) {
          diffsByNodeId.set(normalizedId, nodeDiff.changeType);
          if (nodeDiff.changeType === DiffChangeType.REMOVED) {
            deletedNodeIds.add(normalizedId);
          }
        }
      }

      for (const edgeDiff of diffResult.edges) {
        const parsed = parseXmlHref(edgeDiff.id);
        const normalizedId =
          !parsed.namespace || parsed.namespace === baseModel.definitions["@_namespace"]
            ? parsed.id ?? edgeDiff.id
            : buildXmlHref({ namespace: parsed.namespace, id: parsed.id });
        if (normalizedId) {
          diffsByEdgeId.set(normalizedId, edgeDiff.changeType);
        }
      }

      dmnEditorStoreApi.setState((state) => {
        state.diff.deletedNodeIds = deletedNodeIds;
        state.diff.diffResult = diffResult;
        state.diagram.diffsByNodeId = diffsByNodeId;
        state.diagram.diffsByEdgeId = diffsByEdgeId;

        // Ensure styles are active
        state.diagram.overlays.enableDiffHighlights = true;
        state.diagram.overlays.enableCustomNodeStyles = true;

        // Keep the original model state (changed model) to restore it when closing the diff
        state.diff.changedModel = changedModel;

        // Update the merged model
        state.dispatch(state).dmn.reset(mergedModel);
      });
    },
    [dmnEditorStoreApi]
  );

  const openDiff = useCallback(
    async (baseModelXml: string, changedModelXml: string) => {
      const baseMarshaller = getMarshaller(baseModelXml, { upgradeTo: "latest" });
      const changedMarshaller = getMarshaller(changedModelXml, { upgradeTo: "latest" });

      const baseModel = normalize(baseMarshaller.parser.parse());
      const changedModel = normalize(changedMarshaller.parser.parse());

      dmnEditorStoreApi.setState((state) => {
        state.diff.isDiffModeEnabled = true;
        state.diff.baseModel = baseModel;
      });

      updateStateWithDiff(baseModel, changedModel);
    },
    [dmnEditorStoreApi, updateStateWithDiff]
  );

  const updateDiff = useCallback(
    async (changedModelXml: string) => {
      const state = dmnEditorStoreApi.getState();
      const baseModel = state.diff.baseModel;

      if (!baseModel) {
        console.error("DMN Editor: Cannot update diff. Base model is undefined.");
        return;
      }

      const changedMarshaller = getMarshaller(changedModelXml, { upgradeTo: "latest" });
      const changedModel = normalize(changedMarshaller.parser.parse());

      updateStateWithDiff(baseModel, changedModel);
    },
    [dmnEditorStoreApi, updateStateWithDiff]
  );

  const closeDiff = useCallback(() => {
    dmnEditorStoreApi.setState((state) => {
      const changedModel = state.diff.changedModel;

      state.diff.isDiffModeEnabled = false;
      state.diff.baseModel = undefined;
      state.diff.changedModel = undefined;
      state.diff.deletedNodeIds = new Set();
      state.diff.diffResult = null;
      state.diagram.diffsByNodeId = new Map();
      state.diagram.diffsByEdgeId = new Map();
      state.diagram.overlays.enableDiffHighlights = false;

      if (changedModel) {
        state.dispatch(state).dmn.reset(changedModel);
      } else {
        console.error("DMN Editor: Cannot close diff. Changed model state was lost.");
      }
    });
  }, [dmnEditorStoreApi]);

  return { openDiff, updateDiff, closeDiff };
}
