/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DMN_LATEST__tBinding } from "@kie-tools/dmn-marshaller";
import { BoxedInvocation, BoxedExpression } from "@kie-tools/boxed-expression-component/dist/api";
import { BoxedExpressionDiff, DiffPropertyChange } from "../types";
import { diffArrayElements } from "./diffUtils";

/**
 * Compares two Invocation expressions and returns a structured diff of their differences.
 *
 * Invocation expressions represent function calls with parameter bindings. This function compares:
 * - Parameter bindings: the expressions bound to each parameter
 * - Binding additions and removals
 *
 * @param invA - The base Invocation to compare
 * @param invB - The changed Invocation to compare
 * @param diffBoxedExpression - Function to recursively diff binding expressions
 * @returns A BoxedExpressionDiff object with kind "invocation" containing detailed changes,
 *          or undefined if the invocations are identical
 *
 * @remarks
 * - Uses parameter IDs for matching when available, falls back to index-based matching otherwise
 * - Detects binding additions, removals, and modifications
 * - Recursively diffs the expression associated with each binding
 * - Does not track parameter reordering (invocations typically maintain parameter order)
 */
export function diffInvocation(
  invA: Normalized<BoxedInvocation>,
  invB: Normalized<BoxedInvocation>,
  diffBoxedExpression: (
    a: Normalized<BoxedExpression> | undefined,
    b: Normalized<BoxedExpression> | undefined
  ) => BoxedExpressionDiff | undefined
): BoxedExpressionDiff | undefined {
  if (invA === invB) {
    return undefined;
  }
  const bindingsA = (invA.binding ?? []) as Normalized<DMN_LATEST__tBinding>[];
  const bindingsB = (invB.binding ?? []) as Normalized<DMN_LATEST__tBinding>[];

  const {
    added,
    removed,
    modified,
    hasChanges: bindingsHaveChanges,
  } = diffArrayElements(
    bindingsA,
    bindingsB,
    (b) => b.parameter?.["@_id"],
    (bindingA, bindingB, indexA, indexB) => {
      const exprDiff = diffBoxedExpression(
        (bindingA.expression as Normalized<BoxedExpression>) || undefined,
        (bindingB.expression as Normalized<BoxedExpression>) || undefined
      );

      let indexChange: DiffPropertyChange | undefined;
      if (indexA !== undefined && indexB !== undefined && indexA !== indexB) {
        indexChange = {
          property: "index",
          previousValue: indexA,
          currentValue: indexB,
        };
      }

      if (exprDiff || indexChange) {
        return { expression: exprDiff, index: indexChange };
      }
      return undefined;
    }
  );

  if (!bindingsHaveChanges) return undefined;

  return {
    kind: "invocation",
    bindings: { added, removed, modified },
  };
}
