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

import { getMarshaller } from "@kie-tools/dmn-marshaller";
import { normalize } from "@kie-tools/dmn-marshaller/dist/normalization/normalize";
import { DmnDiffFile, DmnDiffValidationError } from "./types";
import { ALLOWED_FILE_EXTENSION, MAX_FILE_SIZE_BYTES, VALIDATION_ERROR_MESSAGES } from "./constants";

/**
 * Validates file extension
 */
export function validateFileExtension(fileName: string): DmnDiffValidationError | null {
  if (!fileName.toLowerCase().endsWith(ALLOWED_FILE_EXTENSION)) {
    return {
      type: "INVALID_EXTENSION",
      message: VALIDATION_ERROR_MESSAGES.INVALID_EXTENSION,
    };
  }
  return null;
}

/**
 * Validates file size
 */
export function validateFileSize(fileSize: number): DmnDiffValidationError | null {
  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return {
      type: "FILE_TOO_LARGE",
      message: VALIDATION_ERROR_MESSAGES.FILE_TOO_LARGE,
    };
  }
  return null;
}

/**
 * Validates and parses DMN XML content
 */
export function validateAndParseDmnContent(
  fileName: string,
  content: string
): {
  file: DmnDiffFile | null;
  error: DmnDiffValidationError | null;
} {
  try {
    // Check if content is empty
    if (!content || content.trim().length === 0) {
      return {
        file: null,
        error: {
          type: "MALFORMED_XML",
          message: "File is empty",
        },
      };
    }

    // Try to parse the DMN content using the marshaller
    const marshaller = getMarshaller(content, { upgradeTo: "latest" });
    const parsedModel = marshaller.parser.parse();

    // Check if the parsed model is valid
    if (!parsedModel?.definitions) {
      return {
        file: null,
        error: {
          type: "INVALID_DMN",
          message: VALIDATION_ERROR_MESSAGES.INVALID_DMN,
        },
      };
    }

    // Normalize the model
    const normalizedModel = normalize(parsedModel);

    return {
      file: {
        name: fileName,
        content,
        model: normalizedModel,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error parsing DMN file:", error);

    // Determine error type based on error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isXmlError = errorMessage.toLowerCase().includes("xml") || errorMessage.toLowerCase().includes("parse");

    return {
      file: null,
      error: {
        type: isXmlError ? "MALFORMED_XML" : "PARSING_ERROR",
        message: isXmlError ? VALIDATION_ERROR_MESSAGES.MALFORMED_XML : VALIDATION_ERROR_MESSAGES.PARSING_ERROR,
      },
    };
  }
}

/**
 * Validates a file for DMN diff
 */
export async function validateDmnFile(file: File): Promise<{
  file: DmnDiffFile | null;
  error: DmnDiffValidationError | null;
}> {
  // Validate extension
  const extensionError = validateFileExtension(file.name);
  if (extensionError) {
    return { file: null, error: extensionError };
  }

  // Validate size
  const sizeError = validateFileSize(file.size);
  if (sizeError) {
    return { file: null, error: sizeError };
  }

  // Read and parse content
  try {
    const content = await readFileAsText(file);
    return validateAndParseDmnContent(file.name, content);
  } catch (error) {
    console.error("Error reading file:", error);
    return {
      file: null,
      error: {
        type: "PARSING_ERROR",
        message: "Failed to read file",
      },
    };
  }
}

/**
 * Reads a file as text
 */
async function readFileAsText(file: File): Promise<string> {
  try {
    return await file.text();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read file: ${errorMessage}`);
  }
}
