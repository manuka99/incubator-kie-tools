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
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  ExpressionReplacementDiff,
  DiffChangeType,
} from "../types";
import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DmnLatestModel } from "@kie-tools/dmn-marshaller";
import "./DmnDiffChangeList.css";

export interface DmnDiffChangeListProps {
  readonly diffResult: DiffResult | null;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onItemClick?: (elementId: string) => void;
  readonly versionA?: Normalized<DmnLatestModel>;
  readonly versionB?: Normalized<DmnLatestModel>;
}

type DiffItem = NodeDiff | EdgeDiff;

const formatPropertyName = (name: string): string => {
  const overrides: Record<string, string> = {
    typeRef: "Type",
    outputLabel: "Output Label",
    defaultOutputEntry: "Default Output",
  };
  if (overrides[name]) return overrides[name];
  return name.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
};

const getChangeTypeColor = (changeType: DiffChangeType): "green" | "red" | "orange" => {
  switch (changeType) {
    case DiffChangeType.ADDED:
      return "green";
    case DiffChangeType.REMOVED:
      return "red";
    case DiffChangeType.MODIFIED:
      return "orange";
  }
};

const getChangeTypeLabel = (changeType: DiffChangeType): string => {
  switch (changeType) {
    case DiffChangeType.ADDED:
      return "Added";
    case DiffChangeType.REMOVED:
      return "Removed";
    case DiffChangeType.MODIFIED:
      return "Changed";
  }
};

const PropertyChangeDisplay: React.FC<{ change: DiffPropertyChange; propertyName: string }> = React.memo(
  ({ change, propertyName }) => (
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
  )
);

const PropertiesTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <table className="dmn-diff-change-list__details-table">
    <tbody>{children}</tbody>
  </table>
);

const DiffNestedSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="dmn-diff-change-list__nested-section">
    <div className="dmn-diff-change-list__nested-title">{title}</div>
    {children}
  </div>
);

const DiffStatRow: React.FC<{ label: string; count: number; color: "green" | "red" | "orange"; suffix?: string }> = ({
  label,
  count,
  color,
  suffix = "",
}) => {
  if (count <= 0) return null;
  return (
    <tr className="dmn-diff-change-list__details-row">
      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">{label}</td>
      <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
        <Label color={color}>
          {count} {suffix}
        </Label>
      </td>
    </tr>
  );
};

// =================================================================================================
// Detailed Renderers
// =================================================================================================

const GenericExpressionProperties: React.FC<{ diff: BoxedExpressionDiff }> = ({ diff }) => {
  const structuralKeys = new Set([
    "kind",
    "input",
    "output",
    "annotation",
    "rules",
    "entries",
    "parameters",
    "expression",
    "items",
    "bindings",
    "columns",
    "rows",
    "if",
    "then",
    "else",
    "in",
    "match",
    "satisfies",
    "return",
    "result",
    "previousExpression",
    "currentExpression",
    "previousType",
    "currentType",
  ]);

  const propertyKeys = Object.keys(diff).filter((key) => !structuralKeys.has(key) && (diff as any)[key] !== undefined);

  if (propertyKeys.length === 0) return null;

  return (
    <PropertiesTable>
      {propertyKeys.map((key) => (
        <PropertyChangeDisplay key={key} change={(diff as any)[key]} propertyName={key} />
      ))}
    </PropertiesTable>
  );
};

const DecisionTableDetails: React.FC<{ diff: DecisionTableDiff }> = ({ diff }) => (
  <div>
    {(diff.input.added.length > 0 || diff.input.removed.length > 0 || Object.keys(diff.input.modified).length > 0) && (
      <DiffNestedSection title="Input Columns">
        <PropertiesTable>
          <DiffStatRow label="Added" count={diff.input.added.length} color="green" suffix="column(s)" />
          <DiffStatRow label="Removed" count={diff.input.removed.length} color="red" suffix="column(s)" />
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
        </PropertiesTable>
      </DiffNestedSection>
    )}

    {(diff.output.added.length > 0 ||
      diff.output.removed.length > 0 ||
      Object.keys(diff.output.modified).length > 0) && (
      <DiffNestedSection title="Output Columns">
        <PropertiesTable>
          <DiffStatRow label="Added" count={diff.output.added.length} color="green" suffix="column(s)" />
          <DiffStatRow label="Removed" count={diff.output.removed.length} color="red" suffix="column(s)" />
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
        </PropertiesTable>
      </DiffNestedSection>
    )}

    {(diff.rules.added.length > 0 || diff.rules.removed.length > 0 || Object.keys(diff.rules.modified).length > 0) && (
      <DiffNestedSection title="Rules">
        <PropertiesTable>
          <DiffStatRow label="Added" count={diff.rules.added.length} color="green" suffix="rule(s)" />
          <DiffStatRow label="Removed" count={diff.rules.removed.length} color="red" suffix="rule(s)" />
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
              {["inputEntries", "outputEntries", "annotationEntries"].map((entryType) => {
                const entries = (ruleDiff as any)[entryType];
                if (!entries || Object.keys(entries).length === 0) return null;
                return (
                  <tr key={entryType} className="dmn-diff-change-list__details-row">
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--label">
                      {formatPropertyName(entryType)}
                    </td>
                    <td className="dmn-diff-change-list__details-cell dmn-diff-change-list__details-cell--value">
                      {Object.entries(entries).map(([index, changes]: [string, any]) => (
                        <div key={index} style={{ marginBottom: "8px" }}>
                          <strong>Index {index}:</strong>
                          {changes.map((change: DiffPropertyChange, idx: number) => (
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
                );
              })}
            </React.Fragment>
          ))}
        </PropertiesTable>
      </DiffNestedSection>
    )}
  </div>
);

const GenericStructuralDetails: React.FC<{
  diff: BoxedExpressionDiff;
  versionA?: Normalized<DmnLatestModel>;
  versionB?: Normalized<DmnLatestModel>;
}> = ({ diff, versionA, versionB }) => {
  switch (diff.kind) {
    case "functionDefinition": {
      const funcDiff = diff as FunctionDefinitionDiff;
      const hasParamChanges =
        funcDiff.parameters.added.length > 0 ||
        funcDiff.parameters.removed.length > 0 ||
        Object.keys(funcDiff.parameters.modified).length > 0;

      return (
        <div>
          {hasParamChanges && (
            <DiffNestedSection title="Parameters">
              <PropertiesTable>
                <DiffStatRow
                  label="Added"
                  count={funcDiff.parameters.added.length}
                  color="green"
                  suffix="parameter(s)"
                />
                <DiffStatRow
                  label="Removed"
                  count={funcDiff.parameters.removed.length}
                  color="red"
                  suffix="parameter(s)"
                />
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
                    {paramDiff.diffs.map((d, idx) => (
                      <PropertyChangeDisplay key={idx} change={d} propertyName={d.property} />
                    ))}
                  </React.Fragment>
                ))}
              </PropertiesTable>
            </DiffNestedSection>
          )}
          {funcDiff.expression && (
            <DiffNestedSection title={`Body Expression: ${funcDiff.expression.kind}`}>
              <div style={{ paddingLeft: "12px", marginTop: "8px" }}>
                <BoxedExpressionDiffDetails diff={funcDiff.expression} versionA={versionA} versionB={versionB} />
              </div>
            </DiffNestedSection>
          )}
        </div>
      );
    }
    case "list": {
      const listDiff = diff as ListDiff;
      const hasChanges =
        listDiff.items.added.length > 0 ||
        listDiff.items.removed.length > 0 ||
        Object.keys(listDiff.items.modified).length > 0;
      if (!hasChanges) return null;
      return (
        <DiffNestedSection title="List Items">
          <PropertiesTable>
            <DiffStatRow label="Added" count={listDiff.items.added.length} color="green" suffix="item(s)" />
            <DiffStatRow label="Removed" count={listDiff.items.removed.length} color="red" suffix="item(s)" />
            <DiffStatRow
              label="Modified"
              count={Object.keys(listDiff.items.modified).length}
              color="orange"
              suffix="item(s)"
            />
          </PropertiesTable>
        </DiffNestedSection>
      );
    }
    case "invocation": {
      const invDiff = diff as InvocationDiff;
      const hasChanges =
        invDiff.bindings.added.length > 0 ||
        invDiff.bindings.removed.length > 0 ||
        Object.keys(invDiff.bindings.modified).length > 0;
      if (!hasChanges) return null;
      return (
        <DiffNestedSection title="Bindings">
          <PropertiesTable>
            <DiffStatRow label="Added" count={invDiff.bindings.added.length} color="green" suffix="binding(s)" />
            <DiffStatRow label="Removed" count={invDiff.bindings.removed.length} color="red" suffix="binding(s)" />
            <DiffStatRow
              label="Modified"
              count={Object.keys(invDiff.bindings.modified).length}
              color="orange"
              suffix="binding(s)"
            />
          </PropertiesTable>
        </DiffNestedSection>
      );
    }
    case "relation": {
      const relDiff = diff as RelationDiff;
      const hasColChanges =
        relDiff.columns.added.length > 0 ||
        relDiff.columns.removed.length > 0 ||
        Object.keys(relDiff.columns.modified).length > 0;
      const hasRowChanges =
        relDiff.rows.added.length > 0 ||
        relDiff.rows.removed.length > 0 ||
        Object.keys(relDiff.rows.modified).length > 0;
      return (
        <div>
          {hasColChanges && (
            <DiffNestedSection title="Columns">
              <PropertiesTable>
                <DiffStatRow label="Added" count={relDiff.columns.added.length} color="green" suffix="column(s)" />
                <DiffStatRow label="Removed" count={relDiff.columns.removed.length} color="red" suffix="column(s)" />
              </PropertiesTable>
            </DiffNestedSection>
          )}
          {hasRowChanges && (
            <DiffNestedSection title="Rows">
              <PropertiesTable>
                <DiffStatRow label="Added" count={relDiff.rows.added.length} color="green" suffix="row(s)" />
                <DiffStatRow label="Removed" count={relDiff.rows.removed.length} color="red" suffix="row(s)" />
                {Object.keys(relDiff.rows.modified).length > 0 &&
                  Object.entries(relDiff.rows.modified).map(([id, rowDiff]) => (
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
              </PropertiesTable>
            </DiffNestedSection>
          )}
        </div>
      );
    }
    case "conditional": {
      const condDiff = diff as ConditionalDiff;
      return (
        <PropertiesTable>
          {condDiff.if && <DiffStatRow label="If Expression" count={1} color="orange" />}
          {condDiff.then && <DiffStatRow label="Then Expression" count={1} color="orange" />}
          {condDiff.else && <DiffStatRow label="Else Expression" count={1} color="orange" />}
        </PropertiesTable>
      );
    }
    case "filter": {
      const filterDiff = diff as FilterDiff;
      return (
        <PropertiesTable>
          {filterDiff.in && <DiffStatRow label="In Expression" count={1} color="orange" />}
          {filterDiff.match && <DiffStatRow label="Match Expression" count={1} color="orange" />}
        </PropertiesTable>
      );
    }
    case "every":
    case "some":
    case "for": {
      const loopDiff = diff as EveryDiff | SomeDiff | ForDiff;
      return (
        <PropertiesTable>
          {loopDiff.in && <DiffStatRow label="In Expression" count={1} color="orange" />}
          {(loopDiff as EveryDiff).satisfies && <DiffStatRow label="Satisfies Expression" count={1} color="orange" />}
          {(loopDiff as ForDiff).return && <DiffStatRow label="Return Expression" count={1} color="orange" />}
        </PropertiesTable>
      );
    }
    case "expressionReplacement": {
      const replacementDiff = diff as ExpressionReplacementDiff;
      return (
        <div>
          <PropertiesTable>
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
          </PropertiesTable>
          {replacementDiff.previousExpression && (
            <DiffNestedSection title={`Previous Expression Details (${replacementDiff.previousType})`}>
              <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "300px" }}>
                {JSON.stringify(replacementDiff.previousExpression, null, 2)}
              </pre>
            </DiffNestedSection>
          )}
          {replacementDiff.currentExpression && (
            <DiffNestedSection title={`Current Expression Details (${replacementDiff.currentType})`}>
              <pre style={{ fontSize: "12px", overflow: "auto", maxHeight: "300px" }}>
                {JSON.stringify(replacementDiff.currentExpression, null, 2)}
              </pre>
            </DiffNestedSection>
          )}
        </div>
      );
    }
    default:
      return null;
  }
};

const BoxedExpressionDiffDetails: React.FC<{
  diff: BoxedExpressionDiff;
  versionA?: Normalized<DmnLatestModel>;
  versionB?: Normalized<DmnLatestModel>;
}> = ({ diff, versionA, versionB }) => (
  <div>
    <GenericExpressionProperties diff={diff} />
    {diff.kind === "decisionTable" ? (
      <DecisionTableDetails diff={diff as DecisionTableDiff} />
    ) : diff.kind === "context" ? (
      <ContextDetails diff={diff as ContextDiff} />
    ) : (
      <GenericStructuralDetails diff={diff} versionA={versionA} versionB={versionB} />
    )}
  </div>
);

const ContextDetails: React.FC<{ diff: ContextDiff }> = ({ diff }) => {
  const hasEntryChanges =
    diff.entries.added.length > 0 || diff.entries.removed.length > 0 || Object.keys(diff.entries.modified).length > 0;

  return (
    <div>
      {hasEntryChanges && (
        <DiffNestedSection title="Context Entries">
          <PropertiesTable>
            <DiffStatRow label="Added" count={diff.entries.added.length} color="green" suffix="entry(ies)" />
            <DiffStatRow label="Removed" count={diff.entries.removed.length} color="red" suffix="entry(ies)" />
            <DiffStatRow
              label="Modified"
              count={Object.keys(diff.entries.modified).length}
              color="orange"
              suffix="entry(ies)"
            />
          </PropertiesTable>
        </DiffNestedSection>
      )}
      {diff.result && <DiffNestedSection title="Result Expression Changed">{null}</DiffNestedSection>}
    </div>
  );
};

// =================================================================================================
// Main Row Component
// =================================================================================================

const UniversalDiffRow: React.FC<{
  item: DiffItem;
  index: number;
  actualIndex: number;
  itemHeight: number;
  onItemClick?: (elementId: string) => void;
  versionA?: Normalized<DmnLatestModel>;
  versionB?: Normalized<DmnLatestModel>;
}> = ({ item, actualIndex, itemHeight, onItemClick, versionA, versionB }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isNode = item.kind === "node";
  const hasBoxedExpressionDiff = isNode && (item as NodeDiff).boxedExpressionDiff !== undefined;
  const hasPropertyDiff = item.changedProperties && item.changedProperties.length > 0;
  const isExpandable = hasBoxedExpressionDiff || hasPropertyDiff;

  const displayName = item.elementName || item.id;
  const truncatedName = displayName.length > 40 ? `${displayName.substring(0, 40)}...` : displayName;

  const toggleExpand = useCallback(() => {
    if (isExpandable) setIsExpanded((prev) => !prev);
  }, [isExpandable]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onItemClick?.(item.id);
      toggleExpand();
    },
    [onItemClick, item.id, toggleExpand]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        onItemClick?.(item.id);
        toggleExpand();
      }
    },
    [onItemClick, item.id, toggleExpand]
  );

  const renderDetails = () => {
    return (
      <td colSpan={5} className="dmn-diff-change-list__details">
        {hasPropertyDiff && (
          <DiffNestedSection title={`${isNode ? "Element" : "Edge"} Properties`}>
            <PropertiesTable>
              {item.changedProperties!.map((change) => (
                <PropertyChangeDisplay key={change.property} change={change} propertyName={change.property} />
              ))}
            </PropertiesTable>
          </DiffNestedSection>
        )}
        {hasBoxedExpressionDiff && (
          <BoxedExpressionDiffDetails
            diff={(item as NodeDiff).boxedExpressionDiff!}
            versionA={versionA}
            versionB={versionB}
          />
        )}
      </td>
    );
  };

  return (
    <>
      <tr
        className={`dmn-diff-change-list__table-row ${
          isExpandable ? "dmn-diff-change-list__table-row--expandable" : ""
        } ${isExpanded ? "dmn-diff-change-list__table-row--expanded" : ""}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        style={{ height: itemHeight }}
      >
        <td className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--index">{actualIndex}</td>
        <td className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--element" title={displayName}>
          {isExpandable && (
            <span
              className={`dmn-diff-change-list__expand-icon ${
                isExpanded ? "dmn-diff-change-list__expand-icon--expanded" : ""
              }`}
            >
              <AngleRightIcon />
            </span>
          )}
          {truncatedName}
        </td>
        <td className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--type">{item.elementType}</td>
        <td className="dmn-diff-change-list__table-cell dmn-diff-change-list__table-cell--change">
          <Label color={getChangeTypeColor(item.changeType)}>{getChangeTypeLabel(item.changeType)}</Label>
        </td>
        <td className="dmn-diff-change-list__table-cell">
          {hasBoxedExpressionDiff
            ? `Expression: ${(item as NodeDiff).boxedExpressionDiff!.kind}`
            : hasPropertyDiff
              ? "Properties changed"
              : "No details"}
        </td>
      </tr>
      {isExpanded && isExpandable && <tr>{renderDetails()}</tr>}
    </>
  );
};

// =================================================================================================
// Virtualization Hook
// =================================================================================================

function useVirtualizedList<T>(items: T[], containerRef: React.RefObject<HTMLDivElement>, itemHeight: number = 48) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: items.length });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) {
      setVisibleRange({ start: 0, end: items.length });
      return;
    }

    const updateVisibleRange = () => {
      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemsPerView = Math.ceil(containerHeight / itemHeight);
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
      const end = Math.min(items.length, start + itemsPerView + 6);
      setVisibleRange({ start, end });
    };

    updateVisibleRange();
    container.addEventListener("scroll", updateVisibleRange, { passive: true });
    const resizeObserver = new ResizeObserver(updateVisibleRange);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", updateVisibleRange);
      resizeObserver.disconnect();
    };
  }, [containerRef, itemHeight, items.length]);

  return visibleRange;
}

// =================================================================================================
// Main Component
// =================================================================================================

export const DmnDiffChangeList: React.FC<DmnDiffChangeListProps> = ({
  diffResult,
  isOpen,
  onToggle,
  onItemClick,
  versionA,
  versionB,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const diffItems = useMemo<DiffItem[]>(
    () => (diffResult?.hasChanges ? [...diffResult.nodes, ...diffResult.edges] : []),
    [diffResult]
  );
  const visibleRange = useVirtualizedList(diffItems, containerRef, 48);

  const visibleItems = useMemo(() => diffItems.slice(visibleRange.start, visibleRange.end), [diffItems, visibleRange]);

  const itemHeight = 48;
  const totalHeight = diffItems.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  if (!isOpen) {
    return (
      <Button
        variant="primary"
        onClick={onToggle}
        className="dmn-diff-change-list__toggle-button"
        aria-label="Open change list"
        icon={<ListIcon />}
      >
        Changes
        {diffItems.length > 0 && ` (${diffItems.length})`}
      </Button>
    );
  }

  return (
    <div className="dmn-diff-change-list">
      <div className="dmn-diff-change-list__header">
        <Title headingLevel="h3" size="md">
          Model Changes
        </Title>
        <Button variant="plain" onClick={onToggle} aria-label="Close change list" icon={<TimesIcon />} />
      </div>
      <div className="dmn-diff-change-list__content" ref={containerRef}>
        {diffItems.length === 0 ? (
          <div className="dmn-diff-change-list__empty">No changes detected</div>
        ) : (
          <div className="dmn-diff-change-list__table-wrapper" style={{ height: totalHeight }}>
            <table className="dmn-diff-change-list__table">
              <thead>
                <tr>
                  <th className="dmn-diff-change-list__table-header dmn-diff-change-list__table-header--index">#</th>
                  <th className="dmn-diff-change-list__table-header dmn-diff-change-list__table-header--name">
                    Element
                  </th>
                  <th className="dmn-diff-change-list__table-header dmn-diff-change-list__table-header--type">Type</th>
                  <th className="dmn-diff-change-list__table-header dmn-diff-change-list__table-header--change">
                    Change
                  </th>
                  <th className="dmn-diff-change-list__table-header">Details</th>
                </tr>
              </thead>
              <tbody>
                {offsetY > 0 && (
                  <tr style={{ height: offsetY }}>
                    <td colSpan={5} style={{ padding: 0, border: "none", height: offsetY }} />
                  </tr>
                )}
                {visibleItems.map((item, index) => (
                  <UniversalDiffRow
                    key={item.id}
                    item={item}
                    index={index}
                    actualIndex={visibleRange.start + index}
                    itemHeight={itemHeight}
                    onItemClick={onItemClick}
                    versionA={versionA}
                    versionB={versionB}
                  />
                ))}
                {totalHeight - offsetY - visibleItems.length * itemHeight > 0 && (
                  <tr style={{ height: totalHeight - offsetY - visibleItems.length * itemHeight }}>
                    <td colSpan={5} style={{ padding: 0, border: "none" }} />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {diffItems.length > 0 && (
        <div className="dmn-diff-change-list__footer">
          {diffItems.length} change{diffItems.length === 1 ? "" : "s"} detected
        </div>
      )}
    </div>
  );
};
