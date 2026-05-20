import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  isPhoneVerified: boolean;
  isBusinessAccount: boolean;
  bio?: string;
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
  updateProfile: (data: Partial<User>) => void;
  registerBusiness: (data: {
    businessName: string;
    type: "business" | "individual";
    website?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "@eventis_user";

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
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setUser(JSON.parse(stored));
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const persistUser = useCallback(async (u: User) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const login = useCallback(
    async (identifier: string, _password: string) => {
      const newUser: User = {
        id: Date.now().toString(),
        username: identifier.split("@")[0] || identifier,
        email: identifier.includes("@") ? identifier : `${identifier}@eventis.app`,
        isPhoneVerified: false,
        isBusinessAccount: false,
        savedEvents: [],
        joinedDate: new Date().toISOString(),
      };
      await persistUser(newUser);
    },
    [persistUser]
  );

  const register = useCallback(
    async (data: { username: string; email: string; phone?: string; password: string }) => {
      const newUser: User = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        username: data.username,
        email: data.email,
        phone: data.phone,
        isPhoneVerified: false,
        isBusinessAccount: false,
        savedEvents: [],
        joinedDate: new Date().toISOString(),
      };
      await persistUser(newUser);
    },
    [persistUser]
  );

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  const verifyOTP = useCallback(
    async (code: string): Promise<boolean> => {
      if (code.length === 6 && user) {
        const updated = { ...user, isPhoneVerified: true };
        await persistUser(updated);
        setPendingOTPContext(null);
        return true;
      }
      return false;
    },
    [user, persistUser]
  );

  const requestOTP = useCallback(
    (purpose: "register" | "payment" | "chat", eventId?: string) => {
      setPendingOTPContext({ purpose, eventId });
    },
    []
  );

  const clearOTPContext = useCallback(() => {
    setPendingOTPContext(null);
  }, []);

  const toggleSaveEvent = useCallback(
    async (eventId: string) => {
      if (!user) return;
      const saved = user.savedEvents.includes(eventId)
        ? user.savedEvents.filter((id) => id !== eventId)
        : [...user.savedEvents, eventId];
      const updated = { ...user, savedEvents: saved };
      await persistUser(updated);
    },
    [user, persistUser]
  );

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!user) return;
      const updated = { ...user, ...data };
      await persistUser(updated);
    },
    [user, persistUser]
  );

  const registerBusiness = useCallback(
    async (data: { businessName: string; type: "business" | "individual"; website?: string }) => {
      if (!user) return;
      const updated = { ...user, isBusinessAccount: true };
      await persistUser(updated);
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
