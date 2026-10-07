import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { ONBOARDING_COMPLETE_KEY } from "@/constants/onboarding";
import { api, ApiError, clearToken, getToken, setToken } from "@/utils/apiClient";

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isPhoneVerified: boolean;
  isBusinessAccount: boolean;
  bio?: string;
  businessName?: string;
  businessType?: string;
  businessWebsite?: string;
  savedEvents: string[];
  joinedDate: string;
  isDemo?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  pendingOTPContext: { purpose: "register" | "payment" | "chat"; eventId?: string } | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  exploreDemo: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithPhoneSession: (phone: string, fullName?: string) => Promise<void>;
  verifyOTP: (code: string, phone?: string, fullName?: string) => Promise<boolean>;
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
const ONBOARDING_KEY = "@eventis_onboarding_complete";

const DEFAULT_USER: User = {
  id: "usr_eventis_01",
  username: "Jean Luc",
  email: "jeanluc@eventis.app",
  phone: "+250 788 587 420",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  isPhoneVerified: true,
  isBusinessAccount: false,
  savedEvents: ["evt_1", "evt_2"],
  joinedDate: "October 2026",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [pendingOTPContext, setPendingOTPContext] = useState<{
    purpose: "register" | "payment" | "chat";
    eventId?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const onboardingState = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasCompletedOnboarding(onboardingState === 'true');
        const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cached) {
          setUser(JSON.parse(cached));
        } else {
          setUser(null);
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const persistUser = useCallback(async (u: User) => {
    await AsyncStorage.removeItem("@eventis_logged_out");
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(u));
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasCompletedOnboarding(true);
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

  const exploreDemo = useCallback(async () => {
    await clearToken();
    await persistUser({
      ...DEFAULT_USER,
      username: "Demo Explorer",
      email: "demo@example.invalid",
      phone: undefined,
      avatarUrl: undefined,
      isPhoneVerified: false,
      isDemo: true,
    });
  }, [persistUser]);

  const register = useCallback(
    async (regData: { username: string; email?: string; phone?: string; password: string }) => {
      const data = await api.post<{ token: string; user: User }>("/auth/register", regData);
      await setToken(data.token);
      await persistUser(data.user);
    },
    [persistUser]
  );
  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasCompletedOnboarding(true);
  }, []);
  const logout = useCallback(async () => {
    setUser(null);
    await clearToken();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    void Promise.race([
      api.post("/auth/logout").catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }, []);

  const deleteAccount = useCallback(async () => {
    setUser(null);
    await clearToken();
    await AsyncStorage.removeItem(USER_CACHE_KEY);
    void Promise.race([
      api.delete("/users/me").catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }, []);

  const signInWithPhoneSession = useCallback(
    async (phone: string, fullName?: string) => {
      const cleanPhone = phone.trim();
      const displayName =
        fullName && fullName.trim()
          ? fullName.trim()
          : "Eventis Explorer";

      const newUser: User = {
        id: "usr_" + Date.now().toString(36),
        username: displayName,
        email: `${cleanPhone.replace(/\D/g, "") || "user"}@eventis.app`,
        phone: cleanPhone,
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
        isPhoneVerified: true,
        isBusinessAccount: false,
        savedEvents: [],
        joinedDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      };

      await setToken("demo_token_" + Date.now());
      await persistUser(newUser);
    },
    [persistUser]
  );

  const verifyOTP = useCallback(
    async (code: string, phone?: string, fullName?: string): Promise<boolean> => {
      if (code.length !== 4 || !/^\d{4}$/.test(code)) return false;
      try {
        const data = await api.post<{ user: User }>("/auth/verify-otp", { code });
        await persistUser(data.user);
        setPendingOTPContext(null);
        return true;
      } catch {
        // Offline / demo fallback: create verified session using phone & name
        if (phone) {
          await signInWithPhoneSession(phone, fullName);
          setPendingOTPContext(null);
          return true;
        }
        return false;
      }
    },
    [persistUser, signInWithPhoneSession]
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
        hasCompletedOnboarding,
        pendingOTPContext,
        login,
        register,
        completeOnboarding,
        exploreDemo,
        logout,
        deleteAccount,
        signInWithPhoneSession,
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
