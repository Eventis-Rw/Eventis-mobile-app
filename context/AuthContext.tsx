import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { DEMO_AUTH, type LoginInput, type SignupInput } from "@/constants/auth";
import { ONBOARDING_COMPLETE_KEY } from "@/constants/onboarding";
import {
  createOrganisation,
  deleteOrganisation as removeOrganisation,
  startSubscription,
  updateOrganisation as saveOrganisation,
  type DemoOutcome,
  type Organisation,
  type OrganisationInput,
  type OrganiserSubscription,
  type PaymentMethod,
  type SubscriptionResult,
} from "@/services/organiserService";
import { clearLocalProfileData } from "@/services/profileService";
import { deleteAccountAnalytics } from "@/services/analyticsService";
import { requestAccountDeletion } from "@/services/securityService";
import { api, ApiError, clearToken, getToken, setToken } from "@/utils/apiClient";

/**
 * customer   – books and attends events.
 * individual – a person who publishes their own events (no organisation).
 * business   – publishes events as an organisation.
 */
export type AccountType = "customer" | "individual" | "business";

export interface User {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isPhoneVerified: boolean;
  isBusinessAccount: boolean;
  /** Not returned by the API yet; when absent it is derived by `getAccountType`. */
  accountType?: AccountType;
  /** City/area shown on the profile. Businesses fall back to their organisation's location. */
  location?: string;
  bio?: string;
  businessName?: string;
  businessType?: string;
  businessWebsite?: string;
  savedEvents: string[];
  joinedDate: string;
  isDemo?: boolean;
  /** Paid organiser plan. Active but without an organisation means setup is still pending. */
  organiserSubscription?: OrganiserSubscription;
  /** Organisations owned by this account. */
  organisations?: Organisation[];
  /** The organisation currently used throughout the organiser portal. */
  activeOrganisationId?: string;
  /** Active organisation alias retained for existing screens and API compatibility. */
  organisation?: Organisation;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  pendingOTPContext: { purpose: "register" | "payment" | "chat"; eventId?: string } | null;
  login: (input: LoginInput) => Promise<void>;
  register: (data: SignupInput) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  exploreDemo: () => Promise<void>;
  logout: () => Promise<void>;
  /**
   * Deletes the account after the identity check (`deletionToken`) and the
   * typed confirmation. Throws if the server refuses; nothing is cleared then.
   */
  deleteAccount: (deletionToken: string, confirmation: string) => Promise<void>;
  signInWithPhoneSession: (phone: string, fullName?: string) => Promise<void>;
  verifyOTP: (code: string, phone?: string, fullName?: string) => Promise<boolean>;
  requestOTP: (purpose: "register" | "payment" | "chat", eventId?: string) => void;
  clearOTPContext: () => void;
  toggleSaveEvent: (eventId: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  /** Mirrors a phone number the server just verified; keeps the current session. */
  markPhoneVerified: (phone: string) => Promise<void>;
  subscribeAsOrganiser: (
    input: { planId: string; paymentMethod: PaymentMethod; payerPhone: string; duration?: number },
    demoOutcome?: DemoOutcome,
  ) => Promise<SubscriptionResult>;
  /** Spends one post from a pay-per-post pack; does nothing for unlimited plans. */
  consumePost: () => Promise<void>;
  setupOrganisation: (input: OrganisationInput, demoShouldFail?: boolean) => Promise<void>;
  updateOrganisation: (input: OrganisationInput, demoShouldFail?: boolean) => Promise<void>;
  switchOrganisation: (organisationId: string) => Promise<void>;
  deleteOrganisation: (organisationId: string) => Promise<void>;
}

export function getAccountType(user: User | null): AccountType {
  if (user?.accountType) return user.accountType;
  return user?.isBusinessAccount ? "business" : "customer";
}

const AuthContext = createContext<AuthContextType | null>(null);
const USER_CACHE_KEY = "@eventis_user_cache";
const ONBOARDING_KEY = "@eventis_onboarding_complete";
/** BookingsContext's cache; removed on logout and account deletion. */
const BOOKINGS_CACHE_KEY = "@eventis_bookings_v2";

function getOrganisations(user: User): Organisation[] {
  if (user.organisations?.length) return user.organisations;
  return user.organisation ? [user.organisation] : [];
}

function normaliseOrganisationState(user: User): User {
  const organisations = getOrganisations(user);
  const activeOrganisation =
    organisations.find((organisation) => organisation.id === user.activeOrganisationId)
    ?? organisations.find((organisation) => organisation.id === user.organisation?.id)
    ?? organisations[0];

  return {
    ...user,
    organisations,
    activeOrganisationId: activeOrganisation?.id,
    organisation: activeOrganisation,
    isBusinessAccount: organisations.length > 0 || user.isBusinessAccount,
    businessName: activeOrganisation?.name ?? user.businessName,
    businessWebsite: activeOrganisation?.website ?? user.businessWebsite,
  };
}

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
        const onboardingState =
          (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) ??
          (await AsyncStorage.getItem(ONBOARDING_KEY));
        setHasCompletedOnboarding(onboardingState === "true");
        const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cached) {
          setUser(normaliseOrganisationState(JSON.parse(cached) as User));
        } else {
          setUser(null);
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const persistUser = useCallback(async (u: User) => {
    const normalisedUser = normaliseOrganisationState(u);
    await AsyncStorage.removeItem("@eventis_logged_out");
    await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(normalisedUser));
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasCompletedOnboarding(true);
    setUser(normalisedUser);
  }, []);

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
    async (regData: SignupInput) => {
      if (!/^\d{5}$/.test(regData.pin)) throw new Error("Enter a 5 digit PIN.");
      if (DEMO_AUTH) return;
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
    await clearToken();
    await AsyncStorage.multiRemove([USER_CACHE_KEY, BOOKINGS_CACHE_KEY]);
    await AsyncStorage.multiSet([[ONBOARDING_KEY, "true"], [ONBOARDING_COMPLETE_KEY, "true"]]);
    setHasCompletedOnboarding(true);
    setUser(null);
    void Promise.race([
      api.post("/auth/logout").catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }, []);

  const deleteAccount = useCallback(
    async (deletionToken: string, confirmation: string) => {
      const token = await getToken();
      const localOnly = !user || user.isDemo || !token || token.startsWith("demo_token_");
      // Real accounts: the server must confirm first. If it fails, the error
      // reaches the screen and the user stays signed in.
      if (!localOnly) await requestAccountDeletion(deletionToken, confirmation);

      const userId = user?.id;
      setUser(null);
      setHasCompletedOnboarding(false);
      await clearToken();
      await AsyncStorage.multiRemove([USER_CACHE_KEY, ONBOARDING_KEY, ONBOARDING_COMPLETE_KEY, BOOKINGS_CACHE_KEY]);
      if (userId) await clearLocalProfileData(userId).catch(() => undefined);
      if (userId) await deleteAccountAnalytics(userId).catch(() => undefined);
    },
    [user],
  );

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

  const login = useCallback(async (input: LoginInput) => {
    if (!/^\d{5}$/.test(input.pin)) throw new Error("Enter a 5 digit PIN.");
    if (DEMO_AUTH) {
      await signInWithPhoneSession(input.phone);
      return;
    }
    const data = await api.post<{ token: string; user: User }>("/auth/login", input);
    await setToken(data.token);
    await persistUser(data.user);
  }, [persistUser, signInWithPhoneSession]);

  const verifyOTP = useCallback(
    async (code: string, phone?: string, fullName?: string): Promise<boolean> => {
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
      if (!user) return false;
      const isSaved = user.savedEvents.includes(eventId);
      const optimistic = isSaved
        ? user.savedEvents.filter((id) => id !== eventId)
        : [...user.savedEvents, eventId];
      const updated = { ...user, savedEvents: optimistic };
      await persistUser(updated);
      if (user.isDemo) return true;
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
        return false;
      }
      return true;
    },
    [user, persistUser]
  );

  const updateProfile = useCallback(
    async (data: Partial<User>) => {
      if (!user) return;
      // Demo and offline phone sessions have no server account, so they save on
      // the device. Real sessions surface API errors instead of faking success.
      const token = await getToken();
      if (user.isDemo || !token || token.startsWith("demo_token_")) {
        await persistUser({ ...user, ...data });
        return;
      }
      // INTEGRATION POINT: a new photo is a local file URI; upload it through the
      // presigned upload endpoint and send the returned URL once that exists.
      const resp = await api.put<{ user: User }>("/users/me", data);
      await persistUser(resp.user);
    },
    [user, persistUser]
  );

  const markPhoneVerified = useCallback(
    async (phone: string) => {
      if (!user) return;
      await persistUser({ ...user, phone, isPhoneVerified: true });
    },
    [user, persistUser]
  );

  const subscribeAsOrganiser = useCallback(
    async (
      input: { planId: string; paymentMethod: PaymentMethod; payerPhone: string; duration?: number },
      demoOutcome?: DemoOutcome,
    ) => {
      const result = await startSubscription(input, demoOutcome);
      if (result.status === "succeeded" && user) {
        // Buying another post pack tops up the posts left instead of replacing them.
        const bought = result.subscription;
        const left = user.organiserSubscription?.postsRemaining;
        const organiserSubscription =
          bought.postsRemaining !== undefined && left
            ? { ...bought, postsRemaining: bought.postsRemaining + left }
            : bought;
        await persistUser({ ...user, organiserSubscription });
      }
      return result;
    },
    [user, persistUser]
  );

  const consumePost = useCallback(async () => {
    const subscription = user?.organiserSubscription;
    if (!user || !subscription || subscription.postsRemaining === undefined) return;
    await persistUser({
      ...user,
      organiserSubscription: { ...subscription, postsRemaining: Math.max(0, subscription.postsRemaining - 1) },
    });
  }, [user, persistUser]);

  // The active organisation alias keeps existing organiser screens compatible
  // while the collection supports owning and switching between organisations.
  const setupOrganisation = useCallback(
    async (input: OrganisationInput, demoShouldFail?: boolean) => {
      if (!user) throw new Error("Sign in to set up an organisation.");
      const organisation = await createOrganisation(input, demoShouldFail);
      const organisations = [...getOrganisations(user), organisation];
      await persistUser({
        ...user,
        organisations,
        activeOrganisationId: organisation.id,
        organisation,
        isBusinessAccount: true,
        businessName: organisation.name,
        businessWebsite: organisation.website,
      });
    },
    [user, persistUser]
  );

  const updateOrganisation = useCallback(
    async (input: OrganisationInput, demoShouldFail?: boolean) => {
      if (!user?.isBusinessAccount) throw new Error("Only organisers can edit an organisation.");
      const organisation = await saveOrganisation(user.organisation, input, demoShouldFail);
      const organisations = getOrganisations(user).map((candidate) =>
        candidate.id === organisation.id ? organisation : candidate
      );
      await persistUser({
        ...user,
        organisations,
        activeOrganisationId: organisation.id,
        organisation,
        businessName: organisation.name,
        businessWebsite: organisation.website,
      });
    },
    [user, persistUser]
  );

  const switchOrganisation = useCallback(async (organisationId: string) => {
    if (!user) return;
    const organisation = getOrganisations(user).find((candidate) => candidate.id === organisationId);
    if (!organisation) throw new Error("That organisation is no longer available.");
    await persistUser({
      ...user,
      activeOrganisationId: organisation.id,
      organisation,
      businessName: organisation.name,
      businessWebsite: organisation.website,
    });
  }, [user, persistUser]);

  const deleteOrganisation = useCallback(async (organisationId: string) => {
    if (!user) return;
    await removeOrganisation(organisationId);
    const organisations = getOrganisations(user).filter((candidate) => candidate.id !== organisationId);
    const activeOrganisation =
      organisations.find((candidate) => candidate.id === user.activeOrganisationId)
      ?? organisations[0];
    await persistUser({
      ...user,
      organisations,
      activeOrganisationId: activeOrganisation?.id,
      organisation: activeOrganisation,
      isBusinessAccount: organisations.length > 0,
      businessName: activeOrganisation?.name,
      businessType: activeOrganisation ? user.businessType : undefined,
      businessWebsite: activeOrganisation?.website,
    });
  }, [user, persistUser]);

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
        markPhoneVerified,
        subscribeAsOrganiser,
        consumePost,
        setupOrganisation,
        updateOrganisation,
        switchOrganisation,
        deleteOrganisation,
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
