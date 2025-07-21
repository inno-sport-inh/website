// API Configuration
const API_BASE_URL = "http://t9d.store/api";

// import { getMyAccessToken } from "@/api/helpers/access-token.ts";

class APIError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public details?: any,
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = "APIError";
  }
}

// Получить токен и сохранить в localStorage
export async function fetchAndStoreToken() {
  const response = await fetch(
    "https://api.innohassle.ru/accounts/v0/tokens/generate-my-token",
    {
      credentials: "include",
    },
  );
  if (!response.ok) throw new Error("Не удалось получить токен");
  const data = await response.json();
  localStorage.setItem("accessToken", JSON.stringify(data.access_token));
  return data.access_token;
}

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Получаем токен непосредственно перед запросом
  const token = await fetchAndStoreToken();
  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    baseHeaders["Authorization"] = `Bearer ${token}`;
  }

  // Add Content-Type only if it's not FormData
  if (!(options.body instanceof FormData)) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    headers: {
      ...baseHeaders,
      ...options.headers,
    },
    mode: "cors", // Explicitly enable CORS
    credentials: "omit", // Don't send credentials
    ...options,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      const errorDetails = await response.json().catch(() => null);

      // Log detailed error information for debugging
      console.error(`API Error: ${response.status} ${response.statusText}`, {
        url,
        status: response.status,
        statusText: response.statusText,
        details: errorDetails,
      });

      throw new APIError(response.status, response.statusText, errorDetails);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return null as T;

    return JSON.parse(text) as T;
  } catch (error) {
    if (error instanceof APIError) {
      // For 401/403 errors, provide a more helpful message
      if (error.status === 401 || error.status === 403) {
        console.warn(
          `Authentication error for ${url}. Token may be expired or invalid.`,
        );
        throw new Error(
          `Authentication failed: ${error.details?.detail || "Access denied"}`,
        );
      }
      throw error;
    }

    // Handle CORS errors and other network issues
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      console.warn(`CORS or network error for ${url}. Using fallback data.`);
      throw new Error(
        `Network error: Unable to connect to API at ${url}. This might be a CORS issue or the server is unavailable.`,
      );
    }

    throw new Error(`Network error: ${error}`);
  }
}

// Types for FAQ
export interface FAQResponse {
  [question: string]: string;
}

// Types for Clubs
export interface ClubTraining {
  id: number;
  start: string;
  end: string;
  training_class: string | null;
  group_accredited: boolean;
  can_grade: boolean;
  can_check_in: boolean;
  checked_in: boolean;
  participants: {
    total_checked_in: number;
    students: Array<{
      id: number;
      name: string;
      email: string;
      medical_group: string;
      hours: number;
      attended: boolean;
    }>;
  };
  capacity: number;
  available_spots: number;
}

export interface ClubGroup {
  id: number;
  name: string;
  description: string;
  capacity: number;
  current_enrollment: number;
  is_club: boolean;
  accredited: boolean;
  trainings: ClubTraining[];
  trainers: Array<{
    id: number;
    name: string;
    email: string;
  }>;
  allowed_medical_groups: string[];
}

export interface Club {
  id: number;
  name: string;
  description: string;
  groups: ClubGroup[];
  total_groups: number;
}

export type ClubsResponse = Club[];

// FAQ API
export const faqAPI = {
  /**
   * Get all FAQ entries as a dictionary
   */
  getFAQ: async (): Promise<FAQResponse> => {
    return apiRequest<FAQResponse>("/faq");
  },
};

// Clubs API
export const clubsAPI = {
  /**
   * Get all available clubs with detailed groups information
   */
  getClubs: async (): Promise<ClubsResponse> => {
    return apiRequest<ClubsResponse>("/clubs");
  },
};

export default apiRequest;
export { APIError };
