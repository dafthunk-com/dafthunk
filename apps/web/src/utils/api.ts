import { API_BASE_URL } from "@/config/api";

export const apiRequest = async <T>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: object;
    errorMessage?: string;
  } = {}
): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    ...(options.body && { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(options.errorMessage || "Resource not found");
    } else if (response.status === 401 || response.status === 403) {
      throw new Error(options.errorMessage || "Unauthorized access");
    }
    throw new Error(
      options.errorMessage || `Failed to fetch data: ${response.statusText}`
    );
  }
  return response.json();
};
