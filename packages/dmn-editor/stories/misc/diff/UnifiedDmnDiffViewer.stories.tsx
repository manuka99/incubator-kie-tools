/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { DmnUnifiedDiffView } from "../../../src/diff/DmnUnifiedDiffView";
import "@patternfly/react-core/dist/styles/base.css";
import "reactflow/dist/style.css";
import "../../../src/DmnEditor.css";

const meta = {
  title: "Misc/DMN Diff",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj;

export const UnifiedDiffView: Story = {
  render: () => <DmnUnifiedDiffView />,
};
