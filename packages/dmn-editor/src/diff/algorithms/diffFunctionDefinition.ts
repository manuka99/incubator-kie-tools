/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DMN_LATEST__tInformationItem } from "@kie-tools/dmn-marshaller";
import { BoxedFunction, BoxedExpression } from "@kie-tools/boxed-expression-component/dist/api";
import { BoxedExpressionDiff, DiffPropertyChange } from "../types";
import { diffArrayElements } from "./diffUtils";

/**
 * Compares two Function Definition expressions and returns a structured diff of their differences.
 *
 * Function Definitions consist of formal parameters and a body expression. This function compares:
 * - Formal parameters: names, type references, and parameter reordering
 * - The function body expression
 *
 * @param funcA - The base Function Definition to compare
 * @param funcB - The changed Function Definition to compare
 * @param diffBoxedExpression - Function to recursively diff the function body expression
 * @returns A BoxedExpressionDiff object with kind "functionDefinition" containing detailed changes,
 *          or undefined if the function definitions are identical
 *
 * @remarks
 * - Uses ID-based matching when all parameters have IDs, falls back to index-based matching otherwise
 * - Detects parameter additions, removals, modifications, and reordering
 * - Tracks changes to parameter names and type references
 * - Recursively diffs the function body expression
 */
export function diffFunctionDefinition(
  funcA: Normalized<BoxedFunction>,
  funcB: Normalized<BoxedFunction>,
  diffBoxedExpression: (
    a: Normalized<BoxedExpression> | undefined,
    b: Normalized<BoxedExpression> | undefined
  ) => BoxedExpressionDiff | undefined
): BoxedExpressionDiff | undefined {
  if (funcA === funcB) {
    return undefined;
  }
  const paramsA = (funcA.formalParameter ?? []) as Normalized<DMN_LATEST__tInformationItem>[];
  const paramsB = (funcB.formalParameter ?? []) as Normalized<DMN_LATEST__tInformationItem>[];

  let hasChanges = false;

  const {
    added,
    removed,
    modified,
    hasChanges: paramsHaveChanges,
  } = diffArrayElements(
    paramsA,
    paramsB,
    (p) => p["@_id"],
    (paramA, paramB, indexA, indexB) => {
      const changes: DiffPropertyChange[] = [];
      if (paramA["@_name"] !== paramB["@_name"]) {
        changes.push({ property: "name", previousValue: paramA["@_name"], currentValue: paramB["@_name"] });
      }
      if (paramA["@_typeRef"] !== paramB["@_typeRef"]) {
        changes.push({ property: "typeRef", previousValue: paramA["@_typeRef"], currentValue: paramB["@_typeRef"] });
      }

      let indexChange: DiffPropertyChange | undefined;
      if (indexA !== undefined && indexB !== undefined && indexA !== indexB) {
        indexChange = { property: "index", previousValue: indexA, currentValue: indexB };
      }

      if (changes.length > 0 || indexChange) {
        return { diffs: changes, index: indexChange };
      }
      return undefined;
    }
  );

  if (paramsHaveChanges) hasChanges = true;

  const exprDiff = diffBoxedExpression(funcA.expression, funcB.expression);
  if (exprDiff) hasChanges = true;

  if (!hasChanges) return undefined;

  return {
    kind: "functionDefinition",
    parameters: { added, removed, modified },
    expression: exprDiff,
  };
}
