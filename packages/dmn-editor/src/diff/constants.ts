/*
 * Copyright 2025-2026 Aletyx, Inc. (https://aletyx.ai)
 * All Rights Reserved.
 *
 * This is proprietary software. Unauthorized copying, modification,
 * distribution, or use of this software is strictly prohibited.
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
