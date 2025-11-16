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

import { Normalized } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DmnLatestModel } from "@kie-tools/dmn-marshaller";

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
