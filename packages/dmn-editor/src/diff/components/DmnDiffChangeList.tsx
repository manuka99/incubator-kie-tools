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

import * as React from "react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Button } from "@patternfly/react-core/dist/js/components/Button";
import { Title } from "@patternfly/react-core/dist/js/components/Title";
import { Label } from "@patternfly/react-core/dist/js/components/Label";
import { TimesIcon } from "@patternfly/react-icons/dist/js/icons/times-icon";
import { ListIcon } from "@patternfly/react-icons/dist/js/icons/list-icon";
import { AngleRightIcon } from "@patternfly/react-icons/dist/js/icons/angle-right-icon";
import {
  DiffResult,
  NodeDiff,
  EdgeDiff,
  ElementDiff,
  BoxedExpressionDiff,
  DiffPropertyChange,
  DecisionTableDiff,
  ContextDiff,
  FunctionDefinitionDiff,
  ListDiff,
  InvocationDiff,
  RelationDiff,
  ConditionalDiff,
  FilterDiff,
  EveryDiff,
  SomeDiff,
  ForDiff,
  LiteralExpressionDiff,
  ExpressionReplacementDiff,
  DiffChangeType,
} from "../types";
import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DmnLatestModel, DMN_LATEST__tInformationItem } from "@kie-tools/dmn-marshaller";
import "./DmnDiffChangeList.css";

const PANEL_CONSTRAINTS = {
  MIN_WIDTH: 400,
  MAX_WIDTH: 1000,
  DEFAULT_WIDTH: 600,
} as const;

export interface DmnDiffChangeListProps {
  readonly diffResult: DiffResult | null;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onItemClick?: (elementId: string, panelWidth: number) => void;
  readonly versionA?: Normalized<DmnLatestModel>;
  readonly versionB?: Normalized<DmnLatestModel>;
}

/**
 * Gets the color for a given change type.
 */
function getChangeTypeColor(changeType: DiffChangeType): "green" | "red" | "orange" {
  switch (changeType) {
    case DiffChangeType.ADDED:
      return "green";
    case DiffChangeType.REMOVED:
      return "red";
    case DiffChangeType.MODIFIED:
      return "orange";
  }
}

/**
 * Gets the label for a given change type.
 */
function getChangeTypeLabel(changeType: DiffChangeType): string {
  switch (changeType) {
    case DiffChangeType.ADDED:
      return "Added";
    case DiffChangeType.REMOVED:
      return "Removed";
    case DiffChangeType.MODIFIED:
      return "Changed";
  }
}

/** Displays property changes with previous and current values */
const PropertyChangeDisplay: React.FC<{ change: DiffPropertyChange; propertyName: string }> = ({
  change,
  propertyName,
}) => {
  const formatPropertyName = (name: string): string => {
    const nameMap: Record<string, string> = {
      label: "Label",
      typeRef: "Type",
      inputValues: "Input Values",
      outputValues: "Output Values",
      defaultOutputEntry: "Default Output",
      name: "Name",
    };
    return nameMap[name] || name;
  };

  return (
    <tr className="dmn-diff-change-list__details-row">
      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
        {formatPropertyName(propertyName)}
      </td>
      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
        <div className="dmn-diff-change-list__value-change">
          {change.previousValue !== undefined && (
            <div className="dmn-diff-change-list__value-change-item">
              <span className="dmn-diff-change-list__value-change-label">Previous:</span>
              <code className="dmn-diff-change-list__value-change-value">{JSON.stringify(change.previousValue)}</code>
            </div>
          )}
          {change.currentValue !== undefined && (
            <div className="dmn-diff-change-list__value-change-item">
              <span className="dmn-diff-change-list__value-change-label">Current:</span>
              <code className="dmn-diff-change-list__value-change-value">{JSON.stringify(change.currentValue)}</code>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
};

/** Finds a parameter by ID in BKM encapsulated logic */
const findParameterInModel = (
  model: Normalized<DmnLatestModel> | undefined,
  parameterId: string
): Normalized<DMN_LATEST__tInformationItem> | undefined => {
  if (!model?.definitions?.drgElement) {
    return undefined;
  }

  for (const element of model.definitions.drgElement) {
    if (element.__$$element === "businessKnowledgeModel" && element.encapsulatedLogic) {
      const logic = element.encapsulatedLogic as { formalParameter?: Normalized<DMN_LATEST__tInformationItem>[] };
      const params = logic.formalParameter;
      if (Array.isArray(params)) {
        const param = params.find((p) => p["@_id"] === parameterId);
        if (param) {
          return param;
        }
      }
    }
  }
  return undefined;
};

/**
 * Renders details for a literal expression diff
 */
const LiteralExpressionDetails: React.FC<{ diff: LiteralExpressionDiff }> = ({ diff }) => {
  if (!diff.text) {
    return <div>No changes in literal expression</div>;
  }

  return (
    <table className="dmn-diff-change-list__details-table">
      <tbody>
        <PropertyChangeDisplay change={diff.text} propertyName="Text" />
      </tbody>
    </table>
  );
};

/**
 * Renders details for a decision table diff
 */
const DecisionTableDetails: React.FC<{ diff: DecisionTableDiff }> = ({ diff }) => {
  return (
    <div>
      <table className="dmn-diff-change-list__details-table">
        <tbody>
          {diff.hitPolicy && <PropertyChangeDisplay change={diff.hitPolicy} propertyName="Hit Policy" />}
          {diff.aggregation && <PropertyChangeDisplay change={diff.aggregation} propertyName="Aggregation" />}
        </tbody>
      </table>

      {(diff.input.added.length > 0 ||
        diff.input.removed.length > 0 ||
        Object.keys(diff.input.modified).length > 0) && (
        <div className="dmn-diff-change-list__nested-section">
          <div className="dmn-diff-change-list__nested-title">Input Columns</div>
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {diff.input.added.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Added
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="green">{diff.input.added.length} column(s)</Label>
                  </td>
                </tr>
              )}
              {diff.input.removed.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Removed
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="red">{diff.input.removed.length} column(s)</Label>
                  </td>
                </tr>
              )}
              {Object.entries(diff.input.modified).map(([id, columnDiff]) => (
                <React.Fragment key={id}>
                  <tr className="dmn-diff-change-list__details-row">
                    <td
                      colSpan={2}
                      className="dmn-diff-change-list__details-cell"
                      style={{ fontWeight: 600, paddingTop: "12px" }}
                    >
                      <Label color="orange">Modified Column: {id}</Label>
                    </td>
                  </tr>
                  {Object.entries(columnDiff)
                    .filter(([_, value]) => value !== undefined)
                    .map(([prop, change]) => (
                      <PropertyChangeDisplay key={prop} change={change as DiffPropertyChange} propertyName={prop} />
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(diff.output.added.length > 0 ||
        diff.output.removed.length > 0 ||
        Object.keys(diff.output.modified).length > 0) && (
        <div className="dmn-diff-change-list__nested-section">
          <div className="dmn-diff-change-list__nested-title">Output Columns</div>
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {diff.output.added.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Added
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="green">{diff.output.added.length} column(s)</Label>
                  </td>
                </tr>
              )}
              {diff.output.removed.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Removed
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="red">{diff.output.removed.length} column(s)</Label>
                  </td>
                </tr>
              )}
              {Object.entries(diff.output.modified).map(([id, columnDiff]) => (
                <React.Fragment key={id}>
                  <tr className="dmn-diff-change-list__details-row">
                    <td
                      colSpan={2}
                      className="dmn-diff-change-list__details-cell"
                      style={{ fontWeight: 600, paddingTop: "12px" }}
                    >
                      <Label color="orange">Modified Column: {id}</Label>
                    </td>
                  </tr>
                  {Object.entries(columnDiff)
                    .filter(([_, value]) => value !== undefined)
                    .map(([prop, change]) => (
                      <PropertyChangeDisplay key={prop} change={change as DiffPropertyChange} propertyName={prop} />
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(diff.rules.added.length > 0 ||
        diff.rules.removed.length > 0 ||
        Object.keys(diff.rules.modified).length > 0) && (
        <div className="dmn-diff-change-list__nested-section">
          <div className="dmn-diff-change-list__nested-title">Rules</div>
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {diff.rules.added.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Added
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="green">{diff.rules.added.length} rule(s)</Label>
                  </td>
                </tr>
              )}
              {diff.rules.removed.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Removed
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="red">{diff.rules.removed.length} rule(s)</Label>
                  </td>
                </tr>
              )}
              {Object.entries(diff.rules.modified).map(([id, ruleDiff]) => (
                <React.Fragment key={id}>
                  <tr className="dmn-diff-change-list__details-row">
                    <td
                      colSpan={2}
                      className="dmn-diff-change-list__details-cell"
                      style={{ fontWeight: 600, paddingTop: "12px" }}
                    >
                      <Label color="orange">Modified Rule: {id}</Label>
                    </td>
                  </tr>
                  {ruleDiff.index && <PropertyChangeDisplay change={ruleDiff.index} propertyName="Index" />}
                  {Object.keys(ruleDiff.inputEntries).length > 0 && (
                    <tr className="dmn-diff-change-list__details-row">
                      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                        Input Entries
                      </td>
                      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                        {Object.entries(ruleDiff.inputEntries).map(([index, changes]) => (
                          <div key={index} style={{ marginBottom: "8px" }}>
                            <strong>Index {index}:</strong>
                            {changes.map((change, idx) => (
                              <div key={idx} className="dmn-diff-change-list__value-change">
                                {change.previousValue !== undefined && (
                                  <div className="dmn-diff-change-list__value-change-item">
                                    <span className="dmn-diff-change-list__value-change-label">
                                      {change.property} (Prev):
                                    </span>
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {JSON.stringify(change.previousValue)}
                                    </code>
                                  </div>
                                )}
                                {change.currentValue !== undefined && (
                                  <div className="dmn-diff-change-list__value-change-item">
                                    <span className="dmn-diff-change-list__value-change-label">
                                      {change.property} (Curr):
                                    </span>
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {JSON.stringify(change.currentValue)}
                                    </code>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                  {Object.keys(ruleDiff.outputEntries).length > 0 && (
                    <tr className="dmn-diff-change-list__details-row">
                      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                        Output Entries
                      </td>
                      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                        {Object.entries(ruleDiff.outputEntries).map(([index, changes]) => (
                          <div key={index} style={{ marginBottom: "8px" }}>
                            <strong>Index {index}:</strong>
                            {changes.map((change, idx) => (
                              <div key={idx} className="dmn-diff-change-list__value-change">
                                {change.previousValue !== undefined && (
                                  <div className="dmn-diff-change-list__value-change-item">
                                    <span className="dmn-diff-change-list__value-change-label">
                                      {change.property} (Prev):
                                    </span>
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {JSON.stringify(change.previousValue)}
                                    </code>
                                  </div>
                                )}
                                {change.currentValue !== undefined && (
                                  <div className="dmn-diff-change-list__value-change-item">
                                    <span className="dmn-diff-change-list__value-change-label">
                                      {change.property} (Curr):
                                    </span>
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {JSON.stringify(change.currentValue)}
                                    </code>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                  {Object.keys(ruleDiff.annotationEntries).length > 0 && (
                    <tr className="dmn-diff-change-list__details-row">
                      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                        Annotation Entries
                      </td>
                      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                        {Object.entries(ruleDiff.annotationEntries).map(([index, changes]) => (
                          <div key={index} style={{ marginBottom: "8px" }}>
                            <strong>Index {index}:</strong>
                            {changes.map((change, idx) => (
                              <div key={idx} className="dmn-diff-change-list__value-change">
                                {change.previousValue !== undefined && (
                                  <div className="dmn-diff-change-list__value-change-item">
                                    <span className="dmn-diff-change-list__value-change-label">
                                      {change.property} (Prev):
                                    </span>
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {JSON.stringify(change.previousValue)}
                                    </code>
                                  </div>
                                )}
                                {change.currentValue !== undefined && (
                                  <div className="dmn-diff-change-list__value-change-item">
                                    <span className="dmn-diff-change-list__value-change-label">
                                      {change.property} (Curr):
                                    </span>
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {JSON.stringify(change.currentValue)}
                                    </code>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/**
 * Renders details for a context diff
 */
const ContextDetails: React.FC<{ diff: ContextDiff }> = ({ diff }) => {
  return (
    <div>
      {(diff.entries.added.length > 0 ||
        diff.entries.removed.length > 0 ||
        Object.keys(diff.entries.modified).length > 0) && (
        <div className="dmn-diff-change-list__nested-section">
          <div className="dmn-diff-change-list__nested-title">Context Entries</div>
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {diff.entries.added.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Added
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="green">{diff.entries.added.length} entry(ies)</Label>
                  </td>
                </tr>
              )}
              {diff.entries.removed.length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Removed
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="red">{diff.entries.removed.length} entry(ies)</Label>
                  </td>
                </tr>
              )}
              {Object.keys(diff.entries.modified).length > 0 && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Modified
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="orange">{Object.keys(diff.entries.modified).length} entry(ies)</Label>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {diff.result && (
        <div className="dmn-diff-change-list__nested-section">
          <div className="dmn-diff-change-list__nested-title">Result Expression Changed</div>
        </div>
      )}
    </div>
  );
};

/**
 * Renders details for other expression types
 */
const GenericExpressionDetails: React.FC<{
  diff: BoxedExpressionDiff;
  versionA?: Normalized<DmnLatestModel>;
  versionB?: Normalized<DmnLatestModel>;
}> = ({ diff, versionA, versionB }) => {
  const renderGenericDiff = () => {
    switch (diff.kind) {
      case "functionDefinition": {
        const funcDiff = diff as FunctionDefinitionDiff;
        return (
          <div>
            {(funcDiff.parameters.added.length > 0 ||
              funcDiff.parameters.removed.length > 0 ||
              Object.keys(funcDiff.parameters.modified).length > 0) && (
              <div className="dmn-diff-change-list__nested-section">
                <div className="dmn-diff-change-list__nested-title">Parameters</div>
                <table className="dmn-diff-change-list__details-table">
                  <tbody>
                    {funcDiff.parameters.added.length > 0 && (
                      <tr className="dmn-diff-change-list__details-row">
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                          Added
                        </td>
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                          <Label color="green">{funcDiff.parameters.added.length} parameter(s)</Label>
                          <div style={{ marginTop: "8px" }}>
                            {funcDiff.parameters.added.map((id) => {
                              const param = findParameterInModel(versionB, id);
                              return (
                                <div key={id} style={{ marginBottom: "8px", paddingLeft: "12px" }}>
                                  <div>
                                    <strong>Name:</strong>{" "}
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {param?.["@_name"] || id}
                                    </code>
                                  </div>
                                  {param?.["@_typeRef"] && (
                                    <div>
                                      <strong>Type:</strong>{" "}
                                      <code className="dmn-diff-change-list__value-change-value">
                                        {param["@_typeRef"]}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    {funcDiff.parameters.removed.length > 0 && (
                      <tr className="dmn-diff-change-list__details-row">
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                          Removed
                        </td>
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                          <Label color="red">{funcDiff.parameters.removed.length} parameter(s)</Label>
                          <div style={{ marginTop: "8px" }}>
                            {funcDiff.parameters.removed.map((id) => {
                              const param = findParameterInModel(versionA, id);
                              return (
                                <div key={id} style={{ marginBottom: "8px", paddingLeft: "12px" }}>
                                  <div>
                                    <strong>Name:</strong>{" "}
                                    <code className="dmn-diff-change-list__value-change-value">
                                      {param?.["@_name"] || id}
                                    </code>
                                  </div>
                                  {param?.["@_typeRef"] && (
                                    <div>
                                      <strong>Type:</strong>{" "}
                                      <code className="dmn-diff-change-list__value-change-value">
                                        {param["@_typeRef"]}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                    {Object.entries(funcDiff.parameters.modified).map(([id, paramDiff]) => (
                      <React.Fragment key={id}>
                        <tr className="dmn-diff-change-list__details-row">
                          <td
                            colSpan={2}
                            className="dmn-diff-change-list__details-cell"
                            style={{ fontWeight: 600, paddingTop: "12px" }}
                          >
                            <Label color="orange">Modified Parameter: {id}</Label>
                          </td>
                        </tr>
                        {paramDiff.index && <PropertyChangeDisplay change={paramDiff.index} propertyName="Index" />}
                        {paramDiff.diffs.map((diff, idx) => (
                          <PropertyChangeDisplay key={idx} change={diff} propertyName={diff.property} />
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {funcDiff.expression && (
              <div className="dmn-diff-change-list__nested-section">
                <div className="dmn-diff-change-list__nested-title">Body Expression: {funcDiff.expression.kind}</div>
                <div style={{ paddingLeft: "12px", marginTop: "8px" }}>
                  <BoxedExpressionDiffDetails diff={funcDiff.expression} versionA={versionA} versionB={versionB} />
                </div>
              </div>
            )}
          </div>
        );
      }
      case "list": {
        const listDiff = diff as ListDiff;
        return (
          <div className="dmn-diff-change-list__nested-section">
            <div className="dmn-diff-change-list__nested-title">List Items</div>
            <table className="dmn-diff-change-list__details-table">
              <tbody>
                {listDiff.items.added.length > 0 && (
                  <tr className="dmn-diff-change-list__details-row">
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                      Added
                    </td>
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                      <Label color="green">{listDiff.items.added.length} item(s)</Label>
                    </td>
                  </tr>
                )}
                {listDiff.items.removed.length > 0 && (
                  <tr className="dmn-diff-change-list__details-row">
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                      Removed
                    </td>
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                      <Label color="red">{listDiff.items.removed.length} item(s)</Label>
                    </td>
                  </tr>
                )}
                {Object.keys(listDiff.items.modified).length > 0 && (
                  <tr className="dmn-diff-change-list__details-row">
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                      Modified
                    </td>
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                      <Label color="orange">{Object.keys(listDiff.items.modified).length} item(s)</Label>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }
      case "invocation": {
        const invDiff = diff as InvocationDiff;
        return (
          <div className="dmn-diff-change-list__nested-section">
            <div className="dmn-diff-change-list__nested-title">Bindings</div>
            <table className="dmn-diff-change-list__details-table">
              <tbody>
                {invDiff.bindings.added.length > 0 && (
                  <tr className="dmn-diff-change-list__details-row">
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                      Added
                    </td>
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                      <Label color="green">{invDiff.bindings.added.length} binding(s)</Label>
                    </td>
                  </tr>
                )}
                {invDiff.bindings.removed.length > 0 && (
                  <tr className="dmn-diff-change-list__details-row">
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                      Removed
                    </td>
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                      <Label color="red">{invDiff.bindings.removed.length} binding(s)</Label>
                    </td>
                  </tr>
                )}
                {Object.keys(invDiff.bindings.modified).length > 0 && (
                  <tr className="dmn-diff-change-list__details-row">
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                      Modified
                    </td>
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                      <Label color="orange">{Object.keys(invDiff.bindings.modified).length} binding(s)</Label>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      }
      case "relation": {
        const relDiff = diff as RelationDiff;
        return (
          <div>
            {(relDiff.columns.added.length > 0 ||
              relDiff.columns.removed.length > 0 ||
              Object.keys(relDiff.columns.modified).length > 0) && (
              <div className="dmn-diff-change-list__nested-section">
                <div className="dmn-diff-change-list__nested-title">Columns</div>
                <table className="dmn-diff-change-list__details-table">
                  <tbody>
                    {relDiff.columns.added.length > 0 && (
                      <tr className="dmn-diff-change-list__details-row">
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                          Added
                        </td>
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                          <Label color="green">{relDiff.columns.added.length} column(s)</Label>
                        </td>
                      </tr>
                    )}
                    {relDiff.columns.removed.length > 0 && (
                      <tr className="dmn-diff-change-list__details-row">
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                          Removed
                        </td>
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                          <Label color="red">{relDiff.columns.removed.length} column(s)</Label>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            {(relDiff.rows.added.length > 0 ||
              relDiff.rows.removed.length > 0 ||
              Object.keys(relDiff.rows.modified).length > 0) && (
              <div className="dmn-diff-change-list__nested-section">
                <div className="dmn-diff-change-list__nested-title">Rows</div>
                <table className="dmn-diff-change-list__details-table">
                  <tbody>
                    {relDiff.rows.added.length > 0 && (
                      <tr className="dmn-diff-change-list__details-row">
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                          Added
                        </td>
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                          <Label color="green">{relDiff.rows.added.length} row(s)</Label>
                        </td>
                      </tr>
                    )}
                    {relDiff.rows.removed.length > 0 && (
                      <tr className="dmn-diff-change-list__details-row">
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                          Removed
                        </td>
                        <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                          <Label color="red">{relDiff.rows.removed.length} row(s)</Label>
                        </td>
                      </tr>
                    )}
                    {Object.keys(relDiff.rows.modified).length > 0 && (
                      <React.Fragment>
                        {Object.entries(relDiff.rows.modified).map(([id, rowDiff]) => (
                          <React.Fragment key={id}>
                            <tr className="dmn-diff-change-list__details-row">
                              <td
                                colSpan={2}
                                className="dmn-diff-change-list__details-cell"
                                style={{ fontWeight: 600, paddingTop: "12px" }}
                              >
                                <Label color="orange">Modified Row: {id}</Label>
                              </td>
                            </tr>
                            {rowDiff.index && <PropertyChangeDisplay change={rowDiff.index} propertyName="Index" />}
                            {Object.entries(rowDiff.cells).map(([index, cellDiff]) => (
                              <tr key={index} className="dmn-diff-change-list__details-row">
                                <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                                  Column {parseInt(index) + 1}
                                </td>
                                <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                                  <BoxedExpressionDiffDetails diff={cellDiff} versionA={versionA} versionB={versionB} />
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }
      case "conditional": {
        const condDiff = diff as ConditionalDiff;
        return (
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {condDiff.if && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    If Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
              {condDiff.then && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Then Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
              {condDiff.else && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Else Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      }
      case "filter": {
        const filterDiff = diff as FilterDiff;
        return (
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {filterDiff.in && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    In Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
              {filterDiff.match && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Match Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      }
      case "every": {
        const everyDiff = diff as EveryDiff;
        return (
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {everyDiff.in && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    In Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
              {everyDiff.satisfies && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Satisfies Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      }
      case "some": {
        const someDiff = diff as SomeDiff;
        return (
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {someDiff.in && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    In Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
              {someDiff.satisfies && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Satisfies Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      }
      case "for": {
        const forDiff = diff as ForDiff;
        return (
          <table className="dmn-diff-change-list__details-table">
            <tbody>
              {forDiff.in && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    In Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
              {forDiff.return && (
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Return Expression
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    Changed
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        );
      }
      case "expressionReplacement": {
        const replacementDiff = diff as ExpressionReplacementDiff;
        return (
          <div>
            <table className="dmn-diff-change-list__details-table">
              <tbody>
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Previous Type
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="red">{replacementDiff.previousType}</Label>
                  </td>
                </tr>
                <tr className="dmn-diff-change-list__details-row">
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                    Current Type
                  </td>
                  <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                    <Label color="green">{replacementDiff.currentType}</Label>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Show previous expression details */}
            {replacementDiff.previousExpression && (
              <div className="dmn-diff-change-list__nested-section">
                <div className="dmn-diff-change-list__nested-title">
                  Previous Expression Details ({replacementDiff.previousType})
                </div>
                <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "300px" }}>
                  {JSON.stringify(replacementDiff.previousExpression, null, 2)}
                </pre>
              </div>
            )}

            {/* Show current expression details */}
            {replacementDiff.currentExpression && (
              <div className="dmn-diff-change-list__nested-section">
                <div className="dmn-diff-change-list__nested-title">
                  Current Expression Details ({replacementDiff.currentType})
                </div>
                <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "300px" }}>
                  {JSON.stringify(replacementDiff.currentExpression, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      }
      default:
        return <div>Unknown expression type</div>;
    }
  };

  return <div>{renderGenericDiff()}</div>;
};

/**
 * Renders boxed expression diff details based on the expression type
 */
const BoxedExpressionDiffDetails: React.FC<{
  diff: BoxedExpressionDiff;
  versionA?: Normalized<DmnLatestModel>;
  versionB?: Normalized<DmnLatestModel>;
}> = ({ diff, versionA, versionB }) => {
  switch (diff.kind) {
    case "literalExpression":
      return <LiteralExpressionDetails diff={diff} />;
    case "decisionTable":
      return <DecisionTableDetails diff={diff} />;
    case "context":
      return <ContextDetails diff={diff} />;
    default:
      return <GenericExpressionDetails diff={diff} versionA={versionA} versionB={versionB} />;
  }
};

/**
 * Main component for displaying diff changes in a list format
 */
function combineDiffs(diffResult: DiffResult): ElementDiff[] {
  const allChanges: ElementDiff[] = [...diffResult.nodes, ...diffResult.edges];
  return allChanges.sort((a, b) => {
    const typeOrder: Record<string, number> = {
      REMOVED: 0,
      MODIFIED: 1,
      ADDED: 2,
    };
    const typeDiff = (typeOrder[a.changeType] ?? 3) - (typeOrder[b.changeType] ?? 3);
    if (typeDiff !== 0) {
      return typeDiff;
    }
    const nameA = a.elementName || a.id;
    const nameB = b.elementName || b.id;
    return nameA.localeCompare(nameB);
  });
}

function isEdgeDiff(change: ElementDiff): change is EdgeDiff {
  return (change as EdgeDiff).kind === "edge";
}

export const DmnDiffChangeList: React.FC<DmnDiffChangeListProps> = ({
  diffResult,
  isOpen,
  onToggle,
  onItemClick,
  versionA,
  versionB,
}) => {
  const [panelWidth, setPanelWidth] = useState<number>(PANEL_CONSTRAINTS.DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const allChanges = useMemo(() => {
    if (!diffResult?.hasChanges) {
      return [];
    }
    return combineDiffs(diffResult);
  }, [diffResult]);

  const totalChanges = useMemo(() => {
    return allChanges.length;
  }, [allChanges]);

  const handleRowClick = useCallback(
    (elementId: string, changeType: DiffChangeType) => {
      onItemClick?.(elementId, panelWidth);

      if (changeType === DiffChangeType.MODIFIED) {
        setExpandedItems((prev) => {
          const next = new Set(prev);
          if (next.has(elementId)) {
            next.delete(elementId);
          } else {
            next.add(elementId);
          }
          return next;
        });
      }
    },
    [onItemClick, panelWidth]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= PANEL_CONSTRAINTS.MIN_WIDTH && newWidth <= PANEL_CONSTRAINTS.MAX_WIDTH) {
        setPanelWidth(newWidth);
      }
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  if (!isOpen) {
    return (
      <Button
        variant="primary"
        onClick={onToggle}
        className="dmn-diff-change-list__toggle-button"
        aria-label="Open expression diff list"
        icon={<ListIcon />}
      >
        Expression Diffs
        {totalChanges > 0 && ` (${totalChanges})`}
      </Button>
    );
  }

  return (
    <div className="dmn-diff-change-list" style={{ width: `${panelWidth}px` }}>
      <div className="dmn-diff-change-list__header">
        <Title headingLevel="h3" size="md">
          List of Changes
        </Title>
        <Button variant="plain" onClick={onToggle} aria-label="Close change list" icon={<TimesIcon />} />
      </div>
      <div className="dmn-diff-change-list__content" ref={containerRef}>
        {totalChanges === 0 ? (
          <div className="dmn-diff-change-list__empty">No changes detected</div>
        ) : (
          <div className="dmn-diff-change-list__section">
            <table className="dmn-diff-change-list__table">
              <thead>
                <tr>
                  <th className="dmn-diff-change-list__table-header dmn-diff-change-list__table-header--index">#</th>
                  <th className="dmn-diff-change-list__table-header">Name</th>
                  <th className="dmn-diff-change-list__table-header">Type</th>
                  <th className="dmn-diff-change-list__table-header">Change</th>
                </tr>
              </thead>
              <tbody>
                {allChanges.map((change, index) => {
                  const isEdge = isEdgeDiff(change);
                  const displayName = isEdge ? "Edge" : change.elementName || change.id;
                  const truncatedName = displayName.length > 40 ? `${displayName.substring(0, 40)}...` : displayName;
                  const isExpanded = expandedItems.has(change.id);

                  return (
                    <React.Fragment key={change.id}>
                      <tr
                        className={`dmn-diff-change-list__table-row ${isExpanded ? "dmn-diff-change-list__table-row--expanded" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRowClick(change.id, change.changeType);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRowClick(change.id, change.changeType);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                      >
                        <td className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--index">
                          {index + 1}
                        </td>
                        <td
                          className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--name"
                          title={displayName}
                        >
                          {truncatedName}
                        </td>
                        <td className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--type">
                          {change.elementType}
                        </td>
                        <td className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--change">
                          <Label color={getChangeTypeColor(change.changeType)}>
                            {getChangeTypeLabel(change.changeType)}
                          </Label>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="dmn-diff-change-list__details-row">
                          <td colSpan={4} className="dmn-diff-change-list__details-cell">
                            <div className="dmn-diff-change-list__details-content">
                              {change.changedProperties && change.changedProperties.length > 0 ? (
                                <ul className="dmn-diff-change-list__property-list">
                                  {change.changedProperties.map((prop, i) => (
                                    <li key={i}>
                                      <strong>{prop.property}:</strong>{" "}
                                      <span className="dmn-diff-change-list__old-value">
                                        {String(prop.previousValue ?? "undefined")}
                                      </span>{" "}
                                      &rarr;{" "}
                                      <span className="dmn-diff-change-list__new-value">
                                        {String(prop.currentValue ?? "undefined")}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div className="dmn-diff-change-list__no-details">
                                  {change.changeType === "ADDED" ? (
                                    "Element was added."
                                  ) : change.changeType === "REMOVED" ? (
                                    "Element was removed."
                                  ) : !isEdge && (change as NodeDiff).boxedExpressionDiff ? (
                                    <BoxedExpressionDiffViewer
                                      diff={(change as NodeDiff).boxedExpressionDiff!}
                                      versionA={versionA}
                                      versionB={versionB}
                                    />
                                  ) : (
                                    "No specific property changes detected (possibly visual or structural change)."
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {totalChanges > 0 && (
        <div className="dmn-diff-change-list__footer">
          {totalChanges} change{totalChanges === 1 ? "" : "s"} found
        </div>
      )}
      <div className="dmn-diff-change-list__resize-handle" onMouseDown={handleMouseDown} />
    </div>
  );
};

const BoxedExpressionDiffViewer: React.FC<{
  diff: BoxedExpressionDiff;
  versionA: Normalized<DmnLatestModel> | undefined;
  versionB: Normalized<DmnLatestModel> | undefined;
}> = ({ diff, versionA, versionB }) => {
  if (!diff) return null;

  return (
    <div className="dmn-diff-change-list__nested-section">
      <div className="dmn-diff-change-list__nested-title">{camelCaseToSentenceCase(diff.kind)} Logic Modified</div>
      <GenericDiffViewer obj={diff} versionA={versionA} versionB={versionB} />
    </div>
  );
};

const GenericDiffViewer: React.FC<{
  obj: any;
  versionA: Normalized<DmnLatestModel> | undefined;
  versionB: Normalized<DmnLatestModel> | undefined;
}> = ({ obj, versionA, versionB }) => {
  if (!obj || typeof obj !== "object") return null;

  const scalars: Record<string, DiffPropertyChange> = {};
  const collections: Record<string, any> = {};
  const nested: Record<string, any> = {};

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      if (isDiffPropertyChange(item)) {
        scalars[item.property || index.toString()] = item;
      } else if (isBoxedExpressionDiff(item)) {
        nested[index.toString()] = item;
      }
    });
  } else {
    Object.entries(obj).forEach(([key, value]) => {
      if (key === "kind") return;

      if (isDiffPropertyChange(value)) {
        scalars[key] = value as DiffPropertyChange;
      } else if (isCollectionDiff(value)) {
        collections[key] = value;
      } else if (
        isBoxedExpressionDiff(value) ||
        isNestedDiffMap(key, value) ||
        isArrayOfDiffPropertyChanges(value) ||
        isMapOfArraysOfDiffPropertyChanges(value)
      ) {
        nested[key] = value;
      }
    });
  }

  return (
    <>
      <DiffTable scalars={scalars} />

      {Object.entries(collections).map(([key, value]) => (
        <DiffCollectionSection key={key} name={key} collection={value} versionA={versionA} versionB={versionB} />
      ))}

      {Object.entries(nested).map(([key, value]) => (
        <div key={key} className="dmn-diff-change-list__nested-item">
          <strong>{camelCaseToSentenceCase(key)}:</strong>
          {isNestedDiffMap(key, value) || isMapOfArraysOfDiffPropertyChanges(value) ? (
            <div style={{ paddingLeft: "8px", borderLeft: "2px solid var(--pf-v5-global--BorderColor--200)" }}>
              <GenericDiffViewer obj={value} versionA={versionA} versionB={versionB} />
            </div>
          ) : (
            <BoxedExpressionDiffViewer diff={value} versionA={versionA} versionB={versionB} />
          )}
        </div>
      ))}
    </>
  );
};

const DiffTable: React.FC<{ scalars: Record<string, DiffPropertyChange> }> = ({ scalars }) => {
  const entries = Object.entries(scalars);
  if (entries.length === 0) return null;

  return (
    <table className="dmn-diff-change-list__diff-table">
      <thead>
        <tr>
          <th>Property</th>
          <th>Old Value</th>
          <th style={{ width: "20px" }}></th>
          <th>New Value</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([key, change]) => (
          <tr key={key}>
            <td className="dmn-diff-change-list__diff-table-label">{camelCaseToSentenceCase(key)}</td>
            <td className="dmn-diff-change-list__diff-table-value dmn-diff-change-list__old-value">
              {String(change.previousValue ?? "-")}
            </td>
            <td style={{ textAlign: "center", color: "var(--pf-v5-global--Color--200)" }}>&rarr;</td>
            <td className="dmn-diff-change-list__diff-table-value dmn-diff-change-list__new-value">
              {String(change.currentValue ?? "-")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const DiffCollectionSection: React.FC<{
  name: string;
  collection: any;
  versionA: Normalized<DmnLatestModel> | undefined;
  versionB: Normalized<DmnLatestModel> | undefined;
}> = ({ name, collection, versionA, versionB }) => {
  const { added, removed, modified } = collection;
  const hasChanges = added?.length > 0 || removed?.length > 0 || Object.keys(modified || {}).length > 0;

  if (!hasChanges) return null;

  return (
    <div className="dmn-diff-change-list__collection-section">
      <div className="dmn-diff-change-list__collection-title">{camelCaseToSentenceCase(name)}</div>

      {added?.map((id: any, i: number) => {
        const itemInfo = resolveItemInfo(String(id), versionB);
        return (
          <div
            key={`add-${i}`}
            className="dmn-diff-change-list__collection-item dmn-diff-change-list__collection-item--added"
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
              <Label color="green" isCompact>
                Added
              </Label>
              <span className="dmn-diff-change-list__collection-item-label">{itemInfo.label}</span>
            </div>
            {itemInfo.description && (
              <div className="dmn-diff-change-list__collection-item-details">{itemInfo.description}</div>
            )}
          </div>
        );
      })}

      {removed?.map((id: any, i: number) => {
        const itemInfo = resolveItemInfo(String(id), versionA);
        return (
          <div
            key={`rem-${i}`}
            className="dmn-diff-change-list__collection-item dmn-diff-change-list__collection-item--removed"
          >
            <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
              <Label color="red" isCompact>
                Removed
              </Label>
              <span className="dmn-diff-change-list__collection-item-label">{itemInfo.label}</span>
            </div>
          </div>
        );
      })}

      {Object.entries(modified || {}).map(([key, val]: [string, any]) => {
        const itemInfo = resolveItemInfo(key, versionB);
        return (
          <div
            key={`mod-${key}`}
            className="dmn-diff-change-list__collection-item dmn-diff-change-list__collection-item--modified"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <Label color="orange" isCompact>
                Modified
              </Label>
              <span className="dmn-diff-change-list__collection-item-label">{itemInfo.label}</span>
              {val.index && (
                <span className="dmn-diff-change-list__index-change">
                  (Index: {val.index.previousValue} &rarr; {val.index.currentValue})
                </span>
              )}
            </div>
            <div style={{ paddingLeft: "8px", borderLeft: "2px solid var(--pf-v5-global--BorderColor--200)" }}>
              <GenericDiffViewer obj={val} versionA={versionA} versionB={versionB} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

function resolveItemInfo(
  id: string,
  model: Normalized<DmnLatestModel> | undefined
): { label: string; description?: string } {
  if (!model) return { label: `ID: ${id}` };

  const drgElement = model.definitions.drgElement?.find((e: any) => e["@_id"] === id);
  if (drgElement) {
    return { label: drgElement["@_name"] || id };
  }

  const queue: any[] = [...(model.definitions.drgElement || []), ...(model.definitions.artifact || [])];

  const pushChildren = (items: any | any[] | undefined) => {
    if (!items) return;
    if (Array.isArray(items)) {
      queue.push(...items);
    } else {
      queue.push(items);
    }
  };

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    if (current["@_id"] === id) {
      if (current["name"]) return { label: current["name"] };
      if (current["@_name"]) return { label: current["@_name"] };
      if (current["@_label"]) return { label: current["@_label"] };
      if (current.inputExpression) return { label: `Input: ${current.inputExpression.text?.__$$text || "Expression"}` };
      if (current.description) return { label: `Item`, description: current.description?.__$$text };
      return { label: `Item (${id})` };
    }

    const expression =
      current.expression ||
      current.decisionTable ||
      current.literalExpression ||
      current.context ||
      current.relation ||
      current.list ||
      current.invocation ||
      current.functionDefinition ||
      current.conditional ||
      current.filter ||
      current.every ||
      current.some ||
      current.for;

    if (expression) queue.push(expression);

    pushChildren(current.input);
    pushChildren(current.output);
    pushChildren(current.rule);
    pushChildren(current.contextEntry);
    pushChildren(current.column);
    pushChildren(current.row);
    pushChildren(current.item);
    pushChildren(current.binding);
    pushChildren(current.formalParameter);
  }

  return { label: `ID: ${id}` };
}

function isDiffPropertyChange(obj: any): boolean {
  return obj && typeof obj === "object" && "previousValue" in obj && "currentValue" in obj;
}

function isCollectionDiff(obj: any): boolean {
  return obj && typeof obj === "object" && ("added" in obj || "removed" in obj || "modified" in obj);
}

function isBoxedExpressionDiff(obj: any): boolean {
  return obj && typeof obj === "object" && "kind" in obj && !isDiffPropertyChange(obj);
}

function isNestedDiffMap(key: string, obj: any): boolean {
  if (key === "cells" && typeof obj === "object") {
    return Object.values(obj).every((v: any) => isBoxedExpressionDiff(v));
  }
  return false;
}

function isArrayOfDiffPropertyChanges(obj: any): boolean {
  return Array.isArray(obj) && obj.length > 0 && obj.every(isDiffPropertyChange);
}

function isMapOfArraysOfDiffPropertyChanges(obj: any): boolean {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const values = Object.values(obj);
  return values.length > 0 && values.every(isArrayOfDiffPropertyChanges);
}

function camelCaseToSentenceCase(text: string): string {
  if (!text) return "";
  const result = text.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
}
