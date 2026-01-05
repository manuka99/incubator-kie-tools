/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
 */

import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { UnifiedDiffEditorView } from "../../../src/diff/UnifiedDiffEditorView";

const meta: Meta = {
  title: "Misc/DMN Diff",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof UnifiedDiffEditorView>;

export const UnifiedEditor: Story = {
  name: "Unified Diff Editor",
  render: () => <UnifiedDiffEditorView />,
};
