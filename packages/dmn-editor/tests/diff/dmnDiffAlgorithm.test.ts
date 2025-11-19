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

import { DMN_LATEST__DMNShape, DmnLatestModel } from "@kie-tools/dmn-marshaller";
import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { computeDmnDiff } from "../../src/diff/algorithms/dmnDiffAlgorithm";
import { DiffChangeType } from "../../src/diff/types";

const TEST_NAMESPACE = "https://kie.tools/test";

describe("DMN diff algorithm", () => {
  it("returns no diffs for empty diagrams", () => {
    const diff = computeDmnDiff(createEmptyModel(), createEmptyModel());
    expect(diff.hasChanges).toBe(false);
    expect(diff.nodes).toHaveLength(0);
    expect(diff.edges).toHaveLength(0);
  });

  it("detects added nodes", () => {
    const source = createEmptyModel();
    const target = createEmptyModel();

    addInputData(target, { id: "Input_1", name: "Income", x: 10, y: 20 });

    const diff = computeDmnDiff(source, target);
    expect(diff.nodes).toHaveLength(1);
    expect(diff.nodes[0]).toEqual(
      expect.objectContaining({
        id: `${TEST_NAMESPACE}#Input_1`,
        changeType: DiffChangeType.ADDED,
      })
    );
  });

  it("detects removed nodes", () => {
    const source = createEmptyModel();
    addInputData(source, { id: "Input_1", name: "Income", x: 10, y: 20 });

    const diff = computeDmnDiff(source, createEmptyModel());
    expect(diff.nodes).toHaveLength(1);
    expect(diff.nodes[0].changeType).toBe(DiffChangeType.REMOVED);
  });

  it("detects modified node names and layout changes", () => {
    const source = createEmptyModel();
    const target = createEmptyModel();

    addInputData(source, { id: "Input_1", name: "Income", x: 10, y: 20 });
    addInputData(target, { id: "Input_1", name: "Salary", x: 25, y: 50, width: 120, height: 60 });

    const diff = computeDmnDiff(source, target);
    expect(diff.nodes).toHaveLength(1);
    expect(diff.nodes[0].changeType).toBe(DiffChangeType.MODIFIED);
    expect(diff.nodes[0].changedProperties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: "name", previousValue: "Income", currentValue: "Salary" }),
        expect.objectContaining({ property: "position.x", previousValue: 10, currentValue: 25 }),
        expect.objectContaining({ property: "position.y", previousValue: 20, currentValue: 50 }),
        expect.objectContaining({ property: "size.width", previousValue: 160, currentValue: 120 }),
        expect.objectContaining({ property: "size.height", previousValue: 80, currentValue: 60 }),
      ])
    );
  });

  it("ignores minor position drift within tolerance", () => {
    const source = createEmptyModel();
    const target = createEmptyModel();

    addInputData(source, { id: "Input_1", name: "Income", x: 10, y: 20 });
    addInputData(target, { id: "Input_1", name: "Income", x: 10.5, y: 20.5 });

    const diff = computeDmnDiff(source, target);
    expect(diff.nodes).toHaveLength(0);
  });

  it("detects added edges", () => {
    const source = createEmptyModel();
    const target = createEmptyModel();

    addInputData(source, { id: "Input_1", name: "Income", x: 10, y: 20 });
    addInputData(target, { id: "Input_1", name: "Income", x: 10, y: 20 });

    addDecision(target, {
      id: "Decision_1",
      name: "Risk",
      informationRequirements: [{ id: "InfoReq_1", requiredInputId: "Input_1" }],
    });

    const diff = computeDmnDiff(source, target);
    expect(diff.edges).toHaveLength(1);
    expect(diff.edges[0]).toEqual(
      expect.objectContaining({
        id: `${TEST_NAMESPACE}#InfoReq_1`,
        source: `${TEST_NAMESPACE}#Input_1`,
        target: `${TEST_NAMESPACE}#Decision_1`,
        changeType: DiffChangeType.ADDED,
      })
    );
  });

  it("detects removed edges", () => {
    const source = createEmptyModel();
    addInputData(source, { id: "Input_1", name: "Income", x: 10, y: 20 });
    addDecision(source, {
      id: "Decision_1",
      name: "Risk",
      informationRequirements: [{ id: "InfoReq_1", requiredInputId: "Input_1" }],
    });

    const target = createEmptyModel();
    addInputData(target, { id: "Input_1", name: "Income", x: 10, y: 20 });
    addDecision(target, { id: "Decision_1", name: "Risk" });

    const diff = computeDmnDiff(source, target);
    expect(diff.edges).toHaveLength(1);
    expect(diff.edges[0].changeType).toBe(DiffChangeType.REMOVED);
  });

  it("detects modified edges when source changes", () => {
    const source = createEmptyModel();
    const target = createEmptyModel();

    addInputData(source, { id: "Input_1", name: "Income", x: 10, y: 20 });
    addInputData(target, { id: "Input_1", name: "Income", x: 10, y: 20 });
    addInputData(target, { id: "Input_2", name: "Age", x: 40, y: 20 });

    addDecision(source, {
      id: "Decision_1",
      name: "Risk",
      informationRequirements: [{ id: "InfoReq_1", requiredInputId: "Input_1" }],
    });

    addDecision(target, {
      id: "Decision_1",
      name: "Risk",
      informationRequirements: [{ id: "InfoReq_1", requiredInputId: "Input_2" }],
    });

    const diff = computeDmnDiff(source, target);
    expect(diff.edges).toHaveLength(1);
    expect(diff.edges[0].changeType).toBe(DiffChangeType.MODIFIED);
    expect(diff.edges[0].changedProperties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: "source",
          previousValue: `${TEST_NAMESPACE}#Input_1`,
          currentValue: `${TEST_NAMESPACE}#Input_2`,
        }),
      ])
    );
  });
});

function createEmptyModel(): Normalized<DmnLatestModel> {
  return {
    definitions: {
      "@_id": "definitions",
      "@_name": "Test",
      "@_namespace": TEST_NAMESPACE,
      drgElement: [],
      artifact: [],
      "dmndi:DMNDI": {
        "dmndi:DMNDiagram": [
          {
            "@_id": "diagram",
            "dmndi:DMNDiagramElement": [],
          },
        ],
      },
    },
  } as unknown as Normalized<DmnLatestModel>;
}

function addInputData(
  model: Normalized<DmnLatestModel>,
  {
    id,
    name,
    x = 10,
    y = 20,
    width = 160,
    height = 80,
  }: { id: string; name: string; x?: number; y?: number; width?: number; height?: number }
) {
  model.definitions.drgElement?.push({
    __$$element: "inputData",
    "@_id": id,
    "@_name": name,
  });

  diagramElements(model).push(createShape(id, { x, y, width, height }));
}

function addDecision(
  model: Normalized<DmnLatestModel>,
  {
    id,
    name,
    informationRequirements = [],
  }: {
    id: string;
    name: string;
    informationRequirements?: Array<{ id: string; requiredInputId: string }>;
  }
) {
  model.definitions.drgElement?.push({
    __$$element: "decision",
    "@_id": id,
    "@_name": name,
    informationRequirement: informationRequirements.map((req) => ({
      __$$element: "informationRequirement",
      "@_id": req.id,
      requiredInput: { "@_href": `#${req.requiredInputId}` },
    })),
  });

  diagramElements(model).push(createShape(id, { x: 300, y: 200 }));
}

function diagramElements(model: Normalized<DmnLatestModel>) {
  if (!model.definitions["dmndi:DMNDI"]) {
    model.definitions["dmndi:DMNDI"] = {
      "dmndi:DMNDiagram": [
        {
          "@_id": "diagram",
          "dmndi:DMNDiagramElement": [],
        },
      ],
    };
  }

  const dmndi = model.definitions["dmndi:DMNDI"]!;
  dmndi["dmndi:DMNDiagram"] = dmndi["dmndi:DMNDiagram"] ?? [
    {
      "@_id": "diagram",
      "dmndi:DMNDiagramElement": [],
    },
  ];

  const diagram = dmndi["dmndi:DMNDiagram"][0]!;
  diagram["dmndi:DMNDiagramElement"] = diagram["dmndi:DMNDiagramElement"] ?? [];

  return diagram["dmndi:DMNDiagramElement"]!;
}

function createShape(
  elementId: string,
  { x = 0, y = 0, width = 160, height = 80 }: { x?: number; y?: number; width?: number; height?: number }
): Normalized<DMN_LATEST__DMNShape> & { __$$element: "dmndi:DMNShape" } {
  return {
    __$$element: "dmndi:DMNShape",
    "@_id": `${elementId}_shape`,
    "@_dmnElementRef": elementId,
    "dc:Bounds": {
      "@_x": x,
      "@_y": y,
      "@_width": width,
      "@_height": height,
    },
  } as unknown as Normalized<DMN_LATEST__DMNShape> & { __$$element: "dmndi:DMNShape" };
}
