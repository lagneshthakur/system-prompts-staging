/**
 * Timetable Extraction Inspector API
 * Handles timetable document inspection for QA/Debug purposes
 */

import { clearAuthState, getAccessToken } from "./auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000/api/v1";

export interface TimetableExtractionMetadata {
  fileName: string;
  totalActivities: number;
  daysProcessed: number;
  processingTimeMs: number;
  ocrStrategy: string;
  extractionTimestamp: string;
  promptIdUsed?: number;
  [key: string]: unknown;
}

export interface TimetableColumn {
  columnKey: string;
  startTime: string;
  endTime: string;
}

export interface TimetableCell {
  columnKey: string;
  colSpan: number;
  rowSpan: number;
  rawText: string;
  title: string;
  startTime: string;
  endTime: string;
  note?: string;
}

export interface TimetableRow {
  rowIndex: number;
  rowLabel: string;
  cells: TimetableCell[];
}

export interface TimetableOcrOutput {
  columns: TimetableColumn[];
  rows: TimetableRow[];
}

export interface TimetableRawOcrOutput {
  ocr_text?: string;
  raw_response?: string;
  [key: string]: unknown;
}

export interface TimetableActivity {
  day: string;
  start_time: string;
  end_time: string;
  title: string;
  notes: string | null;
}

export interface TimetableInspectionResponse {
  success: boolean;
  message: string;
  metadata: TimetableExtractionMetadata | null;
  ocrOutput: TimetableOcrOutput | null;
  rawOcrOutput: unknown | null;
  activities: TimetableActivity[];
  rawResponse: BackendTimetableResponse;
}

export interface TimetableInspectionError {
  message: string;
}

export const TIMETABLE_REQUEST_QUERY = {
  schema: "true",
  with_file_ref: "true",
  waitForCompletion: "true",
} as const;

export const ACCEPTED_FILE_TYPES = {
  "application/pdf": ["pdf"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/heic": ["heic"],
  "image/heif": ["heif"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "application/vnd.ms-excel": ["xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
} as const;

export const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES)
  .flat()
  .map((extension) => `.${extension}`)
  .join(",");

interface BackendTimetableResponse {
  success: boolean;
  message?: string;
  data?: TimetableExtractionMetadata;
  ocrOutput?: TimetableOcrOutput | TimetableRawOcrOutput | string;
  activities?: TimetableActivity[];
  error?: string;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function parseString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return fallback;
}

function parsePythonLikeLiteral(input: string): unknown {
  const source = input.trim();
  let index = 0;

  function skipWhitespace() {
    while (index < source.length && /\s/.test(source[index])) {
      index += 1;
    }
  }

  function parseQuotedString(quote: "'" | '"'): string {
    index += 1;
    let result = "";

    while (index < source.length) {
      const char = source[index];
      index += 1;

      if (char === "\\") {
        if (index >= source.length) {
          break;
        }

        const escaped = source[index];
        index += 1;

        switch (escaped) {
          case "\\":
          case "'":
          case '"':
          case "/":
            result += escaped;
            break;
          case "b":
            result += "\b";
            break;
          case "f":
            result += "\f";
            break;
          case "n":
            result += "\n";
            break;
          case "r":
            result += "\r";
            break;
          case "t":
            result += "\t";
            break;
          case "u": {
            const unicode = source.slice(index, index + 4);
            if (/^[0-9a-fA-F]{4}$/.test(unicode)) {
              result += String.fromCharCode(Number.parseInt(unicode, 16));
              index += 4;
            } else {
              result += "u";
            }
            break;
          }
          default:
            result += escaped;
            break;
        }

        continue;
      }

      if (char === quote) {
        return result;
      }

      result += char;
    }

    throw new Error("Unterminated string");
  }

  function parseNumericValue(): number {
    const matchedNumber = source.slice(index).match(/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (!matchedNumber) {
      throw new Error(`Invalid number at index ${index}`);
    }

    index += matchedNumber[0].length;
    return Number(matchedNumber[0]);
  }

  function parseArrayValue(): unknown[] {
    index += 1;
    const result: unknown[] = [];
    skipWhitespace();

    if (source[index] === "]") {
      index += 1;
      return result;
    }

    while (index < source.length) {
      result.push(parseValue());
      skipWhitespace();

      if (source[index] === ",") {
        index += 1;
        skipWhitespace();
        continue;
      }

      if (source[index] === "]") {
        index += 1;
        return result;
      }

      throw new Error(`Expected , or ] at index ${index}`);
    }

    throw new Error("Unterminated array");
  }

  function parseObjectValue(): Record<string, unknown> {
    index += 1;
    const result: Record<string, unknown> = {};
    skipWhitespace();

    if (source[index] === "}") {
      index += 1;
      return result;
    }

    while (index < source.length) {
      const key = parseValue();
      if (typeof key !== "string") {
        throw new Error(`Object keys must be strings at index ${index}`);
      }

      skipWhitespace();
      if (source[index] !== ":") {
        throw new Error(`Expected : at index ${index}`);
      }

      index += 1;
      const value = parseValue();
      result[key] = value;
      skipWhitespace();

      if (source[index] === ",") {
        index += 1;
        skipWhitespace();
        continue;
      }

      if (source[index] === "}") {
        index += 1;
        return result;
      }

      throw new Error(`Expected , or } at index ${index}`);
    }

    throw new Error("Unterminated object");
  }

  function parseKeywordValue(): boolean | null {
    if (source.startsWith("None", index)) {
      index += 4;
      return null;
    }

    if (source.startsWith("True", index)) {
      index += 4;
      return true;
    }

    if (source.startsWith("False", index)) {
      index += 5;
      return false;
    }

    throw new Error(`Unexpected token at index ${index}`);
  }

  function parseValue(): unknown {
    skipWhitespace();

    const currentChar = source[index];

    if (currentChar === "{") {
      return parseObjectValue();
    }

    if (currentChar === "[") {
      return parseArrayValue();
    }

    if (currentChar === "'" || currentChar === '"') {
      return parseQuotedString(currentChar);
    }

    if (currentChar === "-" || /\d/.test(currentChar || "")) {
      return parseNumericValue();
    }

    return parseKeywordValue();
  }

  const value = parseValue();
  skipWhitespace();

  if (index !== source.length) {
    throw new Error(`Unexpected trailing content at index ${index}`);
  }

  return value;
}

function tryParsePythonLikeLiteral(input: string): unknown | null {
  try {
    return parsePythonLikeLiteral(input);
  } catch {
    return null;
  }
}

function normalizeTimetableColumn(value: unknown): TimetableColumn | null {
  if (!isRecord(value)) {
    return null;
  }

  const columnKey = parseString(value.columnKey);
  if (!columnKey) {
    return null;
  }

  return {
    columnKey,
    startTime: parseString(value.startTime),
    endTime: parseString(value.endTime),
  };
}

function normalizeTimetableCell(value: unknown): TimetableCell | null {
  if (!isRecord(value)) {
    return null;
  }

  const columnKey = parseString(value.columnKey);
  if (!columnKey) {
    return null;
  }

  const rawText = parseString(value.rawText);
  const title = parseString(value.title, rawText || "Untitled");

  return {
    columnKey,
    colSpan: parseNumber(value.colSpan, 1),
    rowSpan: parseNumber(value.rowSpan, 1),
    rawText,
    title,
    startTime: parseString(value.startTime),
    endTime: parseString(value.endTime),
    note: typeof value.note === "string" ? value.note : undefined,
  };
}

function normalizeTimetableRow(value: unknown, index: number): TimetableRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawCells = Array.isArray(value.cells) ? value.cells : [];

  return {
    rowIndex: parseNumber(value.rowIndex, index),
    rowLabel: parseString(value.rowLabel, `Row ${index + 1}`),
    cells: rawCells
      .map((cell) => normalizeTimetableCell(cell))
      .filter((cell): cell is TimetableCell => cell !== null),
  };
}

function normalizeTimetableOcrShape(value: unknown): TimetableOcrOutput | null {
  if (!isRecord(value)) {
    return null;
  }

  const rawColumns = Array.isArray(value.columns) ? value.columns : null;
  const rawRows = Array.isArray(value.rows) ? value.rows : null;

  if (!rawColumns || !rawRows) {
    return null;
  }

  return {
    columns: rawColumns
      .map((column) => normalizeTimetableColumn(column))
      .filter((column): column is TimetableColumn => column !== null),
    rows: rawRows
      .map((row, index) => normalizeTimetableRow(row, index))
      .filter((row): row is TimetableRow => row !== null),
  };
}

function normalizeTimetableOcrOutput(value: unknown): TimetableOcrOutput | null {
  const directValue = normalizeTimetableOcrShape(value);
  if (directValue) {
    return directValue;
  }

  if (typeof value === "string") {
    const parsedValue = tryParsePythonLikeLiteral(value);
    return parsedValue ? normalizeTimetableOcrShape(parsedValue) : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const stringCandidates = [value.ocr_text, value.raw_response];
  for (const candidate of stringCandidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const parsedValue = tryParsePythonLikeLiteral(candidate);
    const normalizedValue = parsedValue ? normalizeTimetableOcrShape(parsedValue) : null;
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return null;
}

function getExtensionFromFileName(fileName: string): string | null {
  const segments = fileName.toLowerCase().split(".");
  if (segments.length < 2) {
    return null;
  }

  const extension = segments.at(-1);
  return extension ? extension.trim() || null : null;
}

function getExtensionFromMimeType(mimeType: string): string | null {
  if (!mimeType) {
    return null;
  }

  const matchingEntry = Object.entries(ACCEPTED_FILE_TYPES).find(([acceptedMimeType]) => acceptedMimeType === mimeType);
  if (!matchingEntry) {
    return null;
  }

  return matchingEntry[1][0] ?? null;
}

export function getFileType(file: File | null): string | null {
  if (!file) {
    return null;
  }

  return getExtensionFromFileName(file.name) ?? getExtensionFromMimeType(file.type);
}

export function formatJson(value: unknown): string {
  try {
    const formatted = JSON.stringify(value, null, 2);
    return formatted ?? String(value);
  } catch {
    return String(value);
  }
}

export async function runTimetableInspection(
  file: File,
  teacherId: string,
  termId: string
): Promise<{ data?: TimetableInspectionResponse; error?: TimetableInspectionError }> {
  const token = getAccessToken();

  if (!token) {
    return {
      error: {
        message: "Not authenticated. Please login again.",
      },
    };
  }

  const fileType = getFileType(file);
  if (!fileType) {
    return {
      error: {
        message: "Unsupported file type. Please upload a supported timetable file.",
      },
    };
  }

  const formData = new FormData();
  formData.append("image", file);
  formData.append("teacherId", teacherId.trim());
  formData.append("termId", termId.trim());

  const query = new URLSearchParams({
    ...TIMETABLE_REQUEST_QUERY,
    file_type: fileType,
  });

  try {
    const response = await fetch(`${API_BASE_URL}/ai-timetable/extract-simple-textract-async?${query.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.status === 401) {
      clearAuthState();
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
      return {
        error: {
          message: "Session expired. Please login again.",
        },
      };
    }

    const responseText = await response.text();
    let parsedResponse: BackendTimetableResponse | null = null;

    try {
      parsedResponse = JSON.parse(responseText) as BackendTimetableResponse;
    } catch {
      parsedResponse = null;
    }

    if (!response.ok) {
      return {
        error: {
          message:
            parsedResponse?.message ||
            parsedResponse?.error ||
            responseText ||
            `API Error (${response.status})`,
        },
      };
    }

    if (!parsedResponse || !parsedResponse.success) {
      return {
        error: {
          message:
            parsedResponse?.message ||
            parsedResponse?.error ||
            "Timetable extraction failed",
        },
      };
    }

    return {
      data: {
        success: parsedResponse.success,
        message: parsedResponse.message || "Timetable extracted successfully",
        metadata: parsedResponse.data || null,
        ocrOutput: normalizeTimetableOcrOutput(parsedResponse.ocrOutput),
        rawOcrOutput: parsedResponse.ocrOutput ?? null,
        activities: Array.isArray(parsedResponse.activities) ? parsedResponse.activities : [],
        rawResponse: parsedResponse,
      },
    };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Network error. Please try again.",
      },
    };
  }
}
