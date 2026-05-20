import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { api, ApiError, clearToken, getToken, setToken } from "@/utils/apiClient";

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  isPhoneVerified: boolean;
  isBusinessAccount: boolean;
  bio?: string;
  businessName?: string;
  businessType?: string;
  businessWebsite?: string;
  savedEvents: string[];
  joinedDate: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingOTPContext: { purpose: "register" | "payment" | "chat"; eventId?: string } | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  verifyOTP: (code: string) => Promise<boolean>;
  requestOTP: (purpose: "register" | "payment" | "chat", eventId?: string) => void;
  clearOTPContext: () => void;
  toggleSaveEvent: (eventId: string) => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  registerBusiness: (data: {
    businessName: string;
    type: "business" | "individual";
    website?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_CACHE_KEY = "@eventis_user_cache";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingOTPContext, setPendingOTPContext] = useState<{
    purpose: "register" | "payment" | "chat";
    eventId?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          try {
            const data = await api.get<{ user: User }>("/auth/me");
            setUser(data.user);
            await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(data.user));
          } catch {
            const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
            if (cached) setUser(JSON.parse(cached));
          }
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const persistUser = useCallback(async (u: User) => {
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const data = await api.post<{ token: string; user: User }>("/auth/login", {
        identifier,
        password,
      });
      await setToken(data.token);
      await persistUser(data.user);
    },
    [persistUser]
  );

  const register = useCallback(
    async (regData: { username: string; email: string; phone?: string; password: string }) => {
      const data = await api.post<{ token: string; user: User }>("/auth/register", regData);
      await setToken(data.token);
      await persistUser(data.user);
    },
    [persistUser]
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    await clearToken();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    setUser(null);
  }, []);

  const verifyOTP = useCallback(
    async (code: string): Promise<boolean> => {
      if (code.length !== 6 || !/^\d{6}$/.test(code)) return false;
      try {
        const data = await api.post<{ user: User }>("/auth/verify-otp", { code });
        await persistUser(data.user);
        setPendingOTPContext(null);
        return true;
      } catch {
        return false;
      }
    },
    [persistUser]
  );

  const requestOTP = useCallback(
    (purpose: "register" | "payment" | "chat", eventId?: string) => {
      setPendingOTPContext({ purpose, eventId });
      api.post("/auth/request-otp").catch(() => {});
    },
    []
  );

  const clearOTPContext = useCallback(() => {
    setPendingOTPContext(null);
  }, []);

  const toggleSaveEvent = useCallback(
    async (eventId: string) => {
      if (!user) return;
      const isSaved = user.savedEvents.includes(eventId);
      const optimistic = isSaved
        ? user.savedEvents.filter((id) => id !== eventId)
        : [...user.savedEvents, eventId];
      const updated = { ...user, savedEvents: optimistic };
      await persistUser(updated);
      try {
        if (isSaved) {
          await api.delete<{ savedEvents: string[] }>(
            `/users/me/saved-events/${eventId}`
          );
        } else {
          await api.post<{ savedEvents: string[] }>(
            `/users/me/saved-events/${eventId}`
          );
        }
      } catch {
        await persistUser(user);
      }
    },
    [user, persistUser]
  );

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!user) return;
      try {
        const resp = await api.put<{ user: User }>("/users/me", data);
        await persistUser(resp.user);
      } catch {
        await persistUser({ ...user, ...data });
      }
    },
    [user, persistUser]
  );

  const registerBusiness = useCallback(
    async (data: { businessName: string; type: "business" | "individual"; website?: string }) => {
      if (!user) return;
      const resp = await api.post<{ user: User }>("/users/me/business", data);
      await persistUser(resp.user);
    },
    [user, persistUser]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        pendingOTPContext,
        login,
        register,
        logout,
        verifyOTP,
        requestOTP,
        clearOTPContext,
        toggleSaveEvent,
        updateProfile,
        registerBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
