/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DmnLatestModel } from "@kie-tools/dmn-marshaller";

export enum DmnDiffFileVersion {
  VERSION_A = "VERSION_A",
  VERSION_B = "VERSION_B",
}

export interface DmnDiffFile {
  name: string;
  content: string;
  model: Normalized<DmnLatestModel>;
}

export interface DmnDiffValidationError {
  type: "INVALID_EXTENSION" | "FILE_TOO_LARGE" | "MALFORMED_XML" | "INVALID_DMN" | "PARSING_ERROR";
  message: string;
}

export interface DmnDiffState {
  versionA: DmnDiffFile | null;
  versionB: DmnDiffFile | null;
  versionAError: DmnDiffValidationError | null;
  versionBError: DmnDiffValidationError | null;
  isLoadingA: boolean;
  isLoadingB: boolean;
}

export enum DiffChangeType {
  ADDED = "ADDED",
  REMOVED = "REMOVED",
  MODIFIED = "MODIFIED",
}

export interface DiffPropertyChange<T = unknown> {
  property: string;
  previousValue: T | undefined;
  currentValue: T | undefined;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeSize {
  width: number;
  height: number;
}

export interface ElementDiff {
  id: string;
  elementType: string;
  elementName?: string;
  changeType: DiffChangeType;
  changedProperties?: DiffPropertyChange[];
}

export interface NodeDiff extends ElementDiff {
  kind: "node";
  position?: NodePosition;
  size?: NodeSize;
  status?: "pending" | "accepted" | "reverted";
}

export interface EdgeDiff extends ElementDiff {
  kind: "edge";
  source?: string;
  target?: string;
  referenceKind?: string;
  status?: "pending" | "accepted" | "reverted";
}

export interface DiffResult {
  nodes: NodeDiff[];
  edges: EdgeDiff[];
  hasChanges: boolean;
}
