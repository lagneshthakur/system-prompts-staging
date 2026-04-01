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

export interface TimetableActivity {
  day: string;
  start_time: string;
  end_time: string;
  title: string;
  notes: string;
}

export interface TimetableInspectionResponse {
  success: boolean;
  message: string;
  metadata: TimetableExtractionMetadata | null;
  ocrOutput: TimetableOcrOutput | null;
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
  ocrOutput?: TimetableOcrOutput;
  activities?: TimetableActivity[];
  error?: string;
  [key: string]: unknown;
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
        ocrOutput: parsedResponse.ocrOutput || null,
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
