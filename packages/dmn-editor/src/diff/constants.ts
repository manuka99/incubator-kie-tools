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

/**
 * Maximum file size allowed for DMN diff (5MB in bytes)
 */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Allowed file extension for DMN files
 */
export const ALLOWED_FILE_EXTENSION = ".dmn";

/**
 * Validation error messages
 */
export const VALIDATION_ERROR_MESSAGES = {
  INVALID_EXTENSION: `Only ${ALLOWED_FILE_EXTENSION} files are allowed`,
  FILE_TOO_LARGE: `File size must be less than ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
  MALFORMED_XML: "File contains malformed XML",
  INVALID_DMN: "File is not a valid DMN model",
  PARSING_ERROR: "Failed to parse DMN file",
} as const;
