/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DmnLatestModel } from "@kie-tools/dmn-marshaller";
import { BoxedExpression } from "@kie-tools/boxed-expression-component/dist/api";

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
  boxedExpressionDiff?: BoxedExpressionDiff;
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

export type BoxedExpressionDiff =
  | LiteralExpressionDiff
  | DecisionTableDiff
  | ContextDiff
  | FunctionDefinitionDiff
  | ListDiff
  | InvocationDiff
  | RelationDiff
  | ConditionalDiff
  | FilterDiff
  | EveryDiff
  | SomeDiff
  | ForDiff
  | ExpressionReplacementDiff;

export interface ExpressionReplacementDiff {
  kind: "expressionReplacement";
  previousType: string;
  currentType: string;
  previousExpression?: Normalized<BoxedExpression>;
  currentExpression?: Normalized<BoxedExpression>;
}

export interface LiteralExpressionDiff {
  kind: "literalExpression";
  text?: DiffPropertyChange;
}

export interface DecisionTableColumnDiff {
  label?: DiffPropertyChange;
  name?: DiffPropertyChange;
  typeRef?: DiffPropertyChange;
  inputValues?: DiffPropertyChange;
  outputValues?: DiffPropertyChange;
  defaultOutputEntry?: DiffPropertyChange;
  description?: DiffPropertyChange;
  inputExpressionLanguage?: DiffPropertyChange;
  inputExpressionDescription?: DiffPropertyChange;
  inputValuesExpressionLanguage?: DiffPropertyChange;
  inputValuesDescription?: DiffPropertyChange;
  outputValuesExpressionLanguage?: DiffPropertyChange;
  outputValuesDescription?: DiffPropertyChange;
  defaultOutputExpressionLanguage?: DiffPropertyChange;
  defaultOutputDescription?: DiffPropertyChange;
}

export interface DecisionTableDiff {
  kind: "decisionTable";
  hitPolicy?: DiffPropertyChange;
  aggregation?: DiffPropertyChange;
  input: {
    added: string[];
    removed: string[];
    modified: Record<string, DecisionTableColumnDiff>;
  };
  output: {
    added: string[];
    removed: string[];
    modified: Record<string, DecisionTableColumnDiff>;
  };
  annotation?: {
    added: string[];
    removed: string[];
    modified: Record<string, DecisionTableColumnDiff>;
  };
  rules: {
    added: string[];
    removed: string[];
    modified: Record<
      string,
      {
        index?: DiffPropertyChange;
        inputEntries: Record<number, DiffPropertyChange>;
        outputEntries: Record<number, DiffPropertyChange>;
        annotationEntries: Record<number, DiffPropertyChange>;
      }
    >;
  };
}

export interface ContextDiff {
  kind: "context";
  entries: {
    added: string[];
    removed: string[];
    modified: Record<
      string,
      {
        variable?: DiffPropertyChange[];
        expression?: BoxedExpressionDiff;
        index?: DiffPropertyChange;
      }
    >;
  };
  result?: BoxedExpressionDiff;
}

export interface FunctionDefinitionDiff {
  kind: "functionDefinition";
  parameters: {
    added: string[];
    removed: string[];
    modified: Record<string, { diffs: DiffPropertyChange[]; index?: DiffPropertyChange }>;
  };
  expression?: BoxedExpressionDiff;
}

export interface ListDiff {
  kind: "list";
  items: {
    added: number[];
    removed: number[];
    modified: Record<number, { diff?: BoxedExpressionDiff; index?: DiffPropertyChange }>;
  };
}

export interface InvocationDiff {
  kind: "invocation";
  bindings: {
    added: string[];
    removed: string[];
    modified: Record<
      string,
      {
        expression?: BoxedExpressionDiff;
        index?: DiffPropertyChange;
      }
    >;
  };
}

export interface RelationDiff {
  kind: "relation";
  columns: {
    added: string[];
    removed: string[];
    modified: Record<string, DiffPropertyChange[]>;
  };
  rows: {
    added: string[];
    removed: string[];
    modified: Record<string, { index?: DiffPropertyChange; cells: Record<number, BoxedExpressionDiff> }>;
  };
}

export interface ConditionalDiff {
  kind: "conditional";
  if?: BoxedExpressionDiff;
  then?: BoxedExpressionDiff;
  else?: BoxedExpressionDiff;
}

export interface FilterDiff {
  kind: "filter";
  in?: BoxedExpressionDiff;
  match?: BoxedExpressionDiff;
}

export interface EveryDiff {
  kind: "every";
  in?: BoxedExpressionDiff;
  satisfies?: BoxedExpressionDiff;
}

export interface SomeDiff {
  kind: "some";
  in?: BoxedExpressionDiff;
  satisfies?: BoxedExpressionDiff;
}

export interface ForDiff {
  kind: "for";
  in?: BoxedExpressionDiff;
  return?: BoxedExpressionDiff;
}
