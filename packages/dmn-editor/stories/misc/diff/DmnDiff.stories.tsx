/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DmnDiffUploader } from "../../../src/diff/components/DmnDiffUploader";
import { computeDmnDiff } from "../../../src/diff/algorithms/dmnDiffAlgorithm";
import { useDmnDiffStore } from "../../../src/diff/store/DmnDiffStore";
import "@patternfly/react-core/dist/styles/base.css";

const meta: Meta<typeof DmnDiffUploader> = {
  title: "Misc/DMN Diff",
  component: DmnDiffUploader,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof DmnDiffUploader>;

export const DmnDiff: Story = {
  render: () => <DmnDiffUploader />,
};

const DmnDiffAlgoPlayground: React.FC = () => {
  const versionA = useDmnDiffStore((state) => state.versionA);
  const versionB = useDmnDiffStore((state) => state.versionB);
  const isReadyForComparison = useDmnDiffStore((state) => state.isReadyForComparison());
  const lastComparedRef = React.useRef<{ versionA: typeof versionA; versionB: typeof versionB } | null>(null);

  React.useEffect(() => {
    if (!isReadyForComparison || !versionA?.model || !versionB?.model) {
      return;
    }

    if (lastComparedRef.current?.versionA === versionA && lastComparedRef.current?.versionB === versionB) {
      return;
    }

    lastComparedRef.current = { versionA, versionB };

    try {
      const diff = computeDmnDiff(versionA.model, versionB.model);

      const formatPropertyChanges = (
        propertyChanges?: { property: string; previousValue?: unknown; currentValue?: unknown }[]
      ) => {
        if (!propertyChanges || propertyChanges.length === 0) {
          return "";
        }

        return propertyChanges
          .map(
            (change) =>
              `    - ${change.property}: ${String(change.previousValue ?? "—")} -> ${String(change.currentValue ?? "—")}`
          )
          .join("\n");
      };

      const formatElementChanges = (
        elements: Array<{
          id: string;
          elementName?: string;
          elementType: string;
          changeType: string;
          changedProperties?: { property: string; previousValue?: unknown; currentValue?: unknown }[];
        }>
      ) => {
        if (elements.length === 0) {
          return "  none";
        }

        return elements
          .map((element) => {
            const header = `  - ${element.changeType} ${element.elementType} ${element.elementName ?? element.id}`;
            const properties = formatPropertyChanges(element.changedProperties);
            return properties ? `${header}\n${properties}` : header;
          })
          .join("\n");
      };

      const successMessage = [
        "DMN diff complete.",
        `Node changes: ${diff.nodes.length}`,
        `Edge changes: ${diff.edges.length}`,
        "",
        "Node details:",
        formatElementChanges(diff.nodes),
        "",
        "Edge details:",
        formatElementChanges(diff.edges),
      ].join("\n");

      if (typeof globalThis.alert === "function") {
        globalThis.alert(successMessage);
      } else {
        console.log(successMessage);
      }
    } catch (error) {
      const failureMessage = `Failed to compute diff: ${error instanceof Error ? error.message : "Unknown error"}`;
      if (typeof globalThis.alert === "function") {
        globalThis.alert(failureMessage);
      } else {
        console.error(failureMessage);
      }
    }
  }, [isReadyForComparison, versionA, versionB]);

  return <DmnDiffUploader />;
};

export const DiffAlgo: Story = {
  name: "Diff Algorithm Test",
  render: () => <DmnDiffAlgoPlayground />,
};
