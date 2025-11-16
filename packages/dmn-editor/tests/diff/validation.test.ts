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

import {
  validateFileExtension,
  validateFileSize,
  validateAndParseDmnContent,
  validateDmnFile,
} from "../../src/diff/validation";
import { MAX_FILE_SIZE_BYTES, VALIDATION_ERROR_MESSAGES } from "../../src/diff/constants";

describe("DMN Diff Validation", () => {
  describe("validateFileExtension", () => {
    it("should return null for valid .dmn extension", () => {
      const result = validateFileExtension("test.dmn");
      expect(result).toBeNull();
    });

    it("should return null for valid .dmn extension (uppercase)", () => {
      const result = validateFileExtension("test.DMN");
      expect(result).toBeNull();
    });

    it("should return error for .xml extension", () => {
      const result = validateFileExtension("test.xml");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("INVALID_EXTENSION");
      expect(result?.message).toBe(VALIDATION_ERROR_MESSAGES.INVALID_EXTENSION);
    });

    it("should return error for .txt extension", () => {
      const result = validateFileExtension("test.txt");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("INVALID_EXTENSION");
    });

    it("should return error for no extension", () => {
      const result = validateFileExtension("testfile");
      expect(result).not.toBeNull();
      expect(result?.type).toBe("INVALID_EXTENSION");
    });
  });

  describe("validateFileSize", () => {
    it("should return null for valid file size", () => {
      const result = validateFileSize(1024 * 1024); // 1MB
      expect(result).toBeNull();
    });

    it("should return null for file size at limit", () => {
      const result = validateFileSize(MAX_FILE_SIZE_BYTES);
      expect(result).toBeNull();
    });

    it("should return error for file size exceeding limit", () => {
      const result = validateFileSize(MAX_FILE_SIZE_BYTES + 1);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("FILE_TOO_LARGE");
      expect(result?.message).toBe(VALIDATION_ERROR_MESSAGES.FILE_TOO_LARGE);
    });

    it("should return error for very large file", () => {
      const result = validateFileSize(10 * 1024 * 1024); // 10MB
      expect(result).not.toBeNull();
      expect(result?.type).toBe("FILE_TOO_LARGE");
    });
  });

  describe("validateAndParseDmnContent", () => {
    it("should return error for empty content", () => {
      const result = validateAndParseDmnContent("test.dmn", "");
      expect(result.file).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.type).toBe("MALFORMED_XML");
    });

    it("should return error for whitespace-only content", () => {
      const result = validateAndParseDmnContent("test.dmn", "   \n  ");
      expect(result.file).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.type).toBe("MALFORMED_XML");
    });

    it("should return error for invalid XML", () => {
      const result = validateAndParseDmnContent("test.dmn", "not valid xml");
      expect(result.file).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.type).toMatch(/MALFORMED_XML|PARSING_ERROR/);
    });

    it("should successfully parse valid DMN content", () => {
      const validDmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20230324/MODEL/" xmlns="https://kie.apache.org/dmn/_52CEF9FD-9943-4A89-96D5-6F66810CA4C1" xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" xmlns:kie="https://kie.apache.org/dmn/extensions/1.0" xmlns:dmndi="https://www.omg.org/spec/DMN/20230324/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:feel="https://www.omg.org/spec/DMN/20230324/FEEL/" id="_5C6C4C7E-2E88-4DEB-AA18-39D26A9D615A" name="test" typeLanguage="https://www.omg.org/spec/DMN/20230324/FEEL/" namespace="https://kie.apache.org/dmn/_52CEF9FD-9943-4A89-96D5-6F66810CA4C1">
  <dmn:extensionElements/>
</dmn:definitions>`;
      const result = validateAndParseDmnContent("test.dmn", validDmnXml);
      expect(result.file).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.file?.name).toBe("test.dmn");
      expect(result.file?.content).toBe(validDmnXml);
      expect(result.file?.model).toBeDefined();
      expect(result.file?.model.definitions).toBeDefined();
    });
  });

  describe("validateDmnFile", () => {
    it("should reject files with wrong extension", async () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const result = await validateDmnFile(file);
      expect(result.file).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.type).toBe("INVALID_EXTENSION");
    });

    it("should reject files that are too large", async () => {
      const largeContent = "x".repeat(MAX_FILE_SIZE_BYTES + 1);
      const file = new File([largeContent], "test.dmn", { type: "application/xml" });
      const result = await validateDmnFile(file);
      expect(result.file).toBeNull();
      expect(result.error).not.toBeNull();
      expect(result.error?.type).toBe("FILE_TOO_LARGE");
    });

    it("should reject files with invalid DMN content", async () => {
      const file = new File(["invalid xml content"], "test.dmn", { type: "application/xml" });
      const result = await validateDmnFile(file);
      expect(result.file).toBeNull();
      expect(result.error).not.toBeNull();
    });

    it("should accept valid DMN file", async () => {
      const validDmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<dmn:definitions xmlns:dmn="https://www.omg.org/spec/DMN/20230324/MODEL/" xmlns="https://kie.apache.org/dmn/_52CEF9FD-9943-4A89-96D5-6F66810CA4C1" xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" xmlns:kie="https://kie.apache.org/dmn/extensions/1.0" xmlns:dmndi="https://www.omg.org/spec/DMN/20230324/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:feel="https://www.omg.org/spec/DMN/20230324/FEEL/" id="_5C6C4C7E-2E88-4DEB-AA18-39D26A9D615A" name="test" typeLanguage="https://www.omg.org/spec/DMN/20230324/FEEL/" namespace="https://kie.apache.org/dmn/_52CEF9FD-9943-4A89-96D5-6F66810CA4C1">
  <dmn:extensionElements/>
</dmn:definitions>`;
      const file = new File([validDmnXml], "test.dmn", { type: "application/xml" });
      const result = await validateDmnFile(file);
      expect(result.file).not.toBeNull();
      expect(result.error).toBeNull();
      expect(result.file?.name).toBe("test.dmn");
      expect(result.file?.model.definitions).toBeDefined();
    });
  });
});
