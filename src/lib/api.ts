/**
 * API Client for System Prompts Dashboard
 * Handles communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

export interface SystemPrompt {
  id: number;
  name: string;
  content: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      if (process.env.NEXT_PUBLIC_API_LOGGING_ENABLED === 'true') {
        console.log(`🔄 API Request: ${config.method || 'GET'} ${url}`);
      }

      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      if (process.env.NEXT_PUBLIC_API_LOGGING_ENABLED === 'true') {
        console.log(`✅ API Response: ${config.method || 'GET'} ${url}`, data);
      }

      return { data };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (process.env.NEXT_PUBLIC_API_LOGGING_ENABLED === 'true') {
        console.error(`❌ API Error: ${config.method || 'GET'} ${url}`, errorMessage);
      }

      return { error: errorMessage };
    }
  }

  // Get all system prompts
  async getAllPrompts(): Promise<ApiResponse<SystemPrompt[]>> {
    return this.request<SystemPrompt[]>('/admin/prompts');
  }

  // Get specific system prompt by ID
  async getPrompt(id: number): Promise<ApiResponse<SystemPrompt>> {
    return this.request<SystemPrompt>(`/admin/prompts/${id}`);
  }

  // Update system prompt
  async updatePrompt(id: number, content: string): Promise<ApiResponse<SystemPrompt>> {
    return this.request<SystemPrompt>(`/admin/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// System Prompt IDs and Names (matching backend)
export const SYSTEM_PROMPT_IDS = {
  TIMETABLE_EXTRACTION: 1001,
  TIMETABLE_VALIDATION: 1002,
  TIMETABLE_LOOKUP: 1003,
  CURRICULUM_EXTRACTION: 1004,
  LLM_VISUAL_OCR: 1005,
  TIMETABLE_EVENT_DETECTION: 1006,
} as const;

export const SYSTEM_PROMPT_NAMES = {
  [SYSTEM_PROMPT_IDS.TIMETABLE_EXTRACTION]: 'Timetable Extraction',
  [SYSTEM_PROMPT_IDS.TIMETABLE_VALIDATION]: 'Timetable Validation',
  [SYSTEM_PROMPT_IDS.TIMETABLE_LOOKUP]: 'Timetable Lookup',
  [SYSTEM_PROMPT_IDS.CURRICULUM_EXTRACTION]: 'Curriculum Extraction',
  [SYSTEM_PROMPT_IDS.LLM_VISUAL_OCR]: 'LLM Visual OCR',
  [SYSTEM_PROMPT_IDS.TIMETABLE_EVENT_DETECTION]: 'Timetable Event Detection',
} as const;

export type SystemPromptId = typeof SYSTEM_PROMPT_IDS[keyof typeof SYSTEM_PROMPT_IDS];
