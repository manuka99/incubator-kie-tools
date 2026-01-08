/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { BoxedLiteral } from "@kie-tools/boxed-expression-component/dist/api";
import { BoxedExpressionDiff } from "../types";

/**
 * Compares two Literal Expressions and returns a structured diff of their differences.
 *
 * @param exprA - The base Literal Expression to compare
 * @param exprB - The changed Literal Expression to compare
 * @returns A BoxedExpressionDiff object or undefined if identical
 */
export function diffLiteralExpression(
  exprA: Normalized<BoxedLiteral>,
  exprB: Normalized<BoxedLiteral>
): BoxedExpressionDiff | undefined {
  if (exprA === exprB) {
    return undefined;
  }
  const textA = exprA.text?.__$$text;
  const textB = exprB.text?.__$$text;

  if (textA !== textB) {
    return {
      kind: "literalExpression",
      text: {
        property: "text",
        previousValue: textA,
        currentValue: textB,
      },
    };
  }
  return undefined;
}
