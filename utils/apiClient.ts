import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const TOKEN_KEY = "@eventis_jwt";
export const REFRESH_TOKEN_KEY = "@eventis_refresh_token";

function getApiBase(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  // Android emulator reaches the host machine through 10.0.2.2. Web and iOS simulator use localhost.
  const host = Platform.OS === "android" ? "10.0.2.2" : "localhost";
  return `http://${host}:3000`;
}

export const API_BASE = getApiBase();

/** How long any single HTTP request may take before the client gives up. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Uploads can be several MiB, so give media transfers more time. */
const UPLOAD_TIMEOUT_MS = 60_000;

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function setAuthTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken],
  ]);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RefreshedTokens {
  accessToken: string;
  refreshToken: string;
}

let refreshInProgress: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetchWithToken(
    "/api/v1/auth/refresh",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    },
    null,
  );
  if (!response.ok) {
    if (response.status === 401) await clearToken();
    throw await toApiError(response);
  }

  const tokens = (await response.json()) as RefreshedTokens;
  await setAuthTokens(tokens.accessToken, tokens.refreshToken);
  return tokens.accessToken;
}

function refreshOnce(): Promise<string | null> {
  if (!refreshInProgress) {
    refreshInProgress = refreshAccessToken().finally(() => {
      refreshInProgress = null;
    });
  }
  return refreshInProgress;
}

export async function refreshSession(): Promise<string> {
  const token = await refreshOnce();
  if (!token) throw new Error("Your session expired. Please sign in again.");
  return token;
}

function isAuthEndpoint(path: string): boolean {
  return [
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/signup/send-otp",
    "/api/v1/auth/signup/verify-otp",
    "/api/v1/auth/request-otp",
    "/api/v1/auth/request-pin-reset",
    "/api/v1/auth/reset-pin",
    "/api/v1/auth/verify-otp",
  ].some((endpoint) => path === endpoint);
}

async function toApiError(response: Response): Promise<ApiError> {
  let message = response.statusText || "Request failed";
  try {
    const body = (await response.json()) as { message?: unknown; fields?: Record<string, unknown> };
    const fieldMessages = Object.values(body.fields ?? {})
      .flat()
      .filter((item): item is string => typeof item === "string");
    if (fieldMessages.length > 0) {
      message = fieldMessages.join(". ");
    } else if (typeof body.message === "string") {
      message = body.message;
    } else if (Array.isArray(body.message)) {
      message = body.message.filter((item): item is string => typeof item === "string").join(", ") || message;
    }
  } catch {
    // Error responses are not guaranteed to contain JSON.
  }
  return new ApiError(response.status, message);
}

async function fetchWithToken(
  path: string,
  options: RequestInit,
  token: string | null,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const hasJsonBody = options.body !== undefined && options.body !== null && !isFormData;
  const headers: Record<string, string> = {
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The server took too long to respond. Please try again.");
    }
    throw new Error("Can't reach the server. Check your internet connection and try again.");
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  let token = await getToken();
  let response = await fetchWithToken(path, options, token, timeoutMs);

  if (response.status === 401 && token && !isAuthEndpoint(path)) {
    token = await refreshOnce();
    if (token) response = await fetchWithToken(path, options, token, timeoutMs);
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  /** Multipart upload, e.g. photos. */
  postForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "POST", body: form }, UPLOAD_TIMEOUT_MS),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  patchForm: <T>(path: string, form: FormData) =>
    request<T>(path, { method: "PATCH", body: form }, UPLOAD_TIMEOUT_MS),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body === undefined ? undefined : JSON.stringify(body) }),
};
