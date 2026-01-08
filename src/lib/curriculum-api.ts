/**
 * Curriculum Extraction Inspector API
 * Handles curriculum document inspection for QA/Debug purposes
 */

import { getAccessToken, clearAuthState } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

// Pipeline step enum - matches the backend llm_calls steps
export enum InspectionStep {
  CLASSIFICATION = 'classification',
  YEAR_FILTERING = 'year_filtering',
  LO_EXTRACTION = 'lo_extraction',
}

// Display names for each step (used in tabs)
export const INSPECTION_STEP_LABELS: Record<InspectionStep, string> = {
  [InspectionStep.CLASSIFICATION]: 'Classification',
  [InspectionStep.YEAR_FILTERING]: 'Year Filtering',
  [InspectionStep.LO_EXTRACTION]: 'LO Extraction',
};

// Single LLM call result - matches backend llm_calls array item
export interface LLMCall {
  step: InspectionStep;
  model: string;
  input: string | null;
  output: string; // Always a JSON string from the API
}

// Inspection options for selecting which steps to show
export interface InspectionOptions {
  showClassification: boolean;
  showYearFiltering: boolean;
  showExtraction: boolean;
}

// Maps inspection options to steps
export function getEnabledSteps(options: InspectionOptions): InspectionStep[] {
  const steps: InspectionStep[] = [];
  if (options.showClassification) steps.push(InspectionStep.CLASSIFICATION);
  if (options.showYearFiltering) steps.push(InspectionStep.YEAR_FILTERING);
  if (options.showExtraction) steps.push(InspectionStep.LO_EXTRACTION);
  return steps;
}

/**
 * Get the stopped_after value based on the highest checked step.
 * The pipeline is: classification -> year_filtering -> lo_extraction
 * Returns the last step that should be executed.
 */
export function getStoppedAfter(options: InspectionOptions): InspectionStep {
  if (options.showExtraction) {
    return InspectionStep.LO_EXTRACTION;
  }
  if (options.showYearFiltering) {
    return InspectionStep.YEAR_FILTERING;
  }
  return InspectionStep.CLASSIFICATION;
}

// The inspection response containing LLM calls and processed data
export interface InspectionResponse {
  llmCalls: LLMCall[];
  processedData: Record<string, unknown> | null; // The 'data' key from API response
}

export interface InspectionError {
  message: string;
  stage?: InspectionStep;
}

// Year groups available for selection
export const YEAR_GROUPS = [
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
] as const;

export type YearGroup = typeof YEAR_GROUPS[number];

// Accepted file types
export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/msword': ['.doc'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.ms-powerpoint': ['.ppt'],
};

export const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx';

// Backend API response types
interface BackendLLMCall {
  step: string;
  model: string;
  input: string | null;
  output: string;
}

interface BackendApiResponse {
  success: boolean;
  data?: Record<string, unknown>;
  processing_metadata?: Record<string, unknown>;
  llm_calls?: BackendLLMCall[];
  error?: string;
  message?: string;
}

/**
 * Run curriculum inspection using the real backend API
 */
export async function runInspection(
  file: File,
  yearGroup: string,
  options: InspectionOptions
): Promise<{ data?: InspectionResponse; error?: InspectionError }> {
  const token = getAccessToken();

  if (!token) {
    return {
      error: {
        message: 'Not authenticated. Please login again.',
      },
    };
  }

  // Build FormData payload
  const formData = new FormData();
  formData.append('files', file);
  formData.append('use_llm_fallback', 'false');
  // Extract year number from "Year X" format
  const yearNumber = yearGroup.replace('Year ', '');
  formData.append('year_group', yearNumber);
  // Add stop_after based on which checkboxes are selected
  const stopAfter = getStoppedAfter(options);
  formData.append('stop_after', stopAfter);

  try {
    const response = await fetch(`${API_BASE_URL}/curriculum-parser/extract-los-multi-file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData,
    });

    // Handle unauthorized
    if (response.status === 401) {
      clearAuthState();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return {
        error: {
          message: 'Session expired. Please login again.',
        },
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: {
          message: `API Error (${response.status}): ${errorText}`,
        },
      };
    }

    const data: BackendApiResponse = await response.json();

    if (!data.success) {
      return {
        error: {
          message: data.message || data.error || 'Processing failed',
        },
      };
    }

    // Transform backend llm_calls to our format
    const llmCalls: LLMCall[] = [];
    const enabledSteps = getEnabledSteps(options);

    if (data.llm_calls) {
      for (const call of data.llm_calls) {
        // Map backend step names to our enum
        let step: InspectionStep | null = null;
        if (call.step === 'classification') {
          step = InspectionStep.CLASSIFICATION;
        } else if (call.step === 'year_filtering') {
          step = InspectionStep.YEAR_FILTERING;
        } else if (call.step === 'lo_extraction') {
          step = InspectionStep.LO_EXTRACTION;
        }

        // Only include if step is recognized and enabled
        if (step && enabledSteps.includes(step)) {
          llmCalls.push({
            step,
            model: call.model,
            input: call.input,
            output: call.output,
          });
        }
      }
    }

    return { data: { llmCalls, processedData: data.data || null } };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network error. Please try again.',
      },
    };
  }
}

/**
 * Helper to parse JSON output safely
 * Returns formatted JSON string or the original string if not valid JSON
 */
export function formatOutput(output: string): string {
  // Handle markdown code blocks (```json ... ```)
  let cleanOutput = output.trim();
  if (cleanOutput.startsWith('```json')) {
    cleanOutput = cleanOutput.slice(7); // Remove ```json
  } else if (cleanOutput.startsWith('```')) {
    cleanOutput = cleanOutput.slice(3); // Remove ```
  }
  if (cleanOutput.endsWith('```')) {
    cleanOutput = cleanOutput.slice(0, -3); // Remove trailing ```
  }
  cleanOutput = cleanOutput.trim();

  try {
    const parsed = JSON.parse(cleanOutput);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Not JSON, return original (not cleaned) to preserve markdown if present
    return output;
  }
}

/**
 * Helper to check if output is valid JSON
 */
export function isJsonOutput(output: string): boolean {
  // Handle markdown code blocks
  let cleanOutput = output.trim();
  if (cleanOutput.startsWith('```json')) {
    cleanOutput = cleanOutput.slice(7);
  } else if (cleanOutput.startsWith('```')) {
    cleanOutput = cleanOutput.slice(3);
  }
  if (cleanOutput.endsWith('```')) {
    cleanOutput = cleanOutput.slice(0, -3);
  }
  cleanOutput = cleanOutput.trim();

  try {
    JSON.parse(cleanOutput);
    return true;
  } catch {
    return false;
  }
}
