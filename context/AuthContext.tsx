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
import {
  api,
  ApiError,
  clearToken,
  getRefreshToken,
  getToken,
  setAuthTokens,
  setToken,
} from "@/utils/apiClient";

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

interface ApiUser {
  id: string;
  phone: string;
  displayName?: string | null;
  firstName?: string | null;
  username?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  accountType?: string | null;
  roles?: string[];
  bio?: string | null;
  location?: string | null;
  createdAt?: string;
}

interface ApiAuthSession {
  user: ApiUser;
  tokens: { accessToken: string; refreshToken: string };
}

function mapApiUser(remote: ApiUser, cached?: User): User {
  const previous = cached?.id === remote.id ? cached : undefined;
  const hasPublisherRole = remote.roles?.includes("organizer_owner") ?? false;
  const isPublisher = remote.accountType === "POSTER" || hasPublisherRole;
  const createdAt = remote.createdAt ? new Date(remote.createdAt) : undefined;
  const accountType: AccountType = isPublisher
    ? previous?.accountType === "business"
      ? "business"
      : "individual"
    : "customer";

  return {
    ...previous,
    id: remote.id,
    username:
      remote.displayName ??
      remote.firstName ??
      remote.username ??
      previous?.username ??
      remote.phone,
    email: remote.email !== undefined ? remote.email ?? "" : previous?.email ?? "",
    phone: remote.phone,
    avatarUrl: remote.avatarUrl ?? previous?.avatarUrl,
    isPhoneVerified: true,
    isBusinessAccount: hasPublisherRole || previous?.isBusinessAccount === true,
    accountType,
    bio: remote.bio !== undefined ? remote.bio ?? undefined : previous?.bio,
    location: remote.location !== undefined ? remote.location ?? undefined : previous?.location,
    savedEvents: previous?.savedEvents ?? [],
    joinedDate:
      createdAt && !Number.isNaN(createdAt.getTime())
        ? createdAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })
        : previous?.joinedDate ?? new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

interface SavedEventsPage {
  items: { eventId: string }[];
  page: number;
  limit: number;
  total: number;
}

async function fetchSavedEventIds(): Promise<string[]> {
  const limit = 100;
  const ids: string[] = [];
  let page = 1;

  for (;;) {
    const result = await api.get<SavedEventsPage>(
      `/api/v1/me/saved-events?page=${page}&limit=${limit}`,
    );
    ids.push(...result.items.map((item) => item.eventId));
    if (result.items.length === 0 || page * result.limit >= result.total) break;
    page += 1;
  }

  return ids;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  pendingOTPContext: { purpose: "register" | "payment" | "chat"; eventId?: string } | null;
  login: (input: LoginInput) => Promise<void>;
  register: (data: SignupInput) => Promise<void>;
  resendSignupOTP: () => Promise<void>;
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
  const [pendingSignup, setPendingSignup] = useState<SignupInput | null>(null);

  useEffect(() => {
    (async () => {
      let cachedUser: User | null = null;
      try {
        const onboardingState =
          (await AsyncStorage.getItem(ONBOARDING_COMPLETE_KEY)) ??
          (await AsyncStorage.getItem(ONBOARDING_KEY));
        setHasCompletedOnboarding(onboardingState === "true");
        const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cached) cachedUser = JSON.parse(cached) as User;
      } catch {
        cachedUser = null;
      }

      try {
        const token = await getToken();
        if (
          cachedUser &&
          !cachedUser.isDemo &&
          (!token || token.startsWith("demo_token_"))
        ) {
          await AsyncStorage.removeItem(USER_CACHE_KEY);
          cachedUser = null;
        }
        if (token && !token.startsWith("demo_token_")) {
          const remote = await api.get<ApiUser>("/api/v1/auth/me");
          const mapped = mapApiUser(remote, cachedUser ?? undefined);
          cachedUser = {
            ...mapped,
            savedEvents: await fetchSavedEventIds().catch(() => mapped.savedEvents),
          };
          await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(cachedUser));
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          await clearToken();
          await AsyncStorage.removeItem(USER_CACHE_KEY);
          cachedUser = null;
        }
      } finally {
        setUser(cachedUser ? normaliseOrganisationState(cachedUser) : null);
        setIsLoading(false);
      }
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
      await api.post("/api/v1/auth/signup", {
        phone: regData.phone,
        username: regData.username,
        accountType: "CUSTOMER",
        pin: regData.pin,
      });
      setPendingSignup(regData);
    },
    []
  );
  const resendSignupOTP = useCallback(async () => {
    if (DEMO_AUTH) return;
    if (!pendingSignup) throw new Error("Start account creation again to request a new code.");
    await api.post("/api/v1/auth/signup/send-otp", {
      phone: pendingSignup.phone,
      username: pendingSignup.username,
      accountType: "CUSTOMER",
      pin: pendingSignup.pin,
    });
  }, [pendingSignup]);
  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
    setHasCompletedOnboarding(true);
  }, []);
  const logout = useCallback(async () => {
    const token = await getToken();
    const refreshToken = await getRefreshToken();
    if (user && !user.isDemo && token && !token.startsWith("demo_token_") && refreshToken) {
      await api.post<void>("/api/v1/auth/logout", { refreshToken });
    }
    await clearToken();
    await AsyncStorage.multiRemove([USER_CACHE_KEY, BOOKINGS_CACHE_KEY]);
    await AsyncStorage.multiSet([[ONBOARDING_KEY, "true"], [ONBOARDING_COMPLETE_KEY, "true"]]);
    setHasCompletedOnboarding(true);
    setPendingSignup(null);
    setUser(null);
  }, [user]);

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

      await clearToken();
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
    const data = await api.post<ApiAuthSession>("/api/v1/auth/login", input);
    await setAuthTokens(data.tokens.accessToken, data.tokens.refreshToken);
    try {
      const nextUser = mapApiUser(data.user, user ?? undefined);
      const savedEvents = await fetchSavedEventIds().catch(() => nextUser.savedEvents);
      await persistUser({ ...nextUser, savedEvents });
    } catch (error) {
      await clearToken();
      throw error;
    }
  }, [persistUser, signInWithPhoneSession, user]);

  const verifyOTP = useCallback(
    async (code: string, phone?: string, fullName?: string): Promise<boolean> => {
      if (code.length !== 6 || !/^\d{6}$/.test(code)) return false;
      if (DEMO_AUTH) {
        await signInWithPhoneSession(phone ?? "", fullName);
        setPendingSignup(null);
        return true;
      }
      if (!phone) throw new Error("Phone number is required to verify this account.");
      const data = await api.post<ApiAuthSession>("/api/v1/auth/signup/verify-otp", { phone, code });
      await setAuthTokens(data.tokens.accessToken, data.tokens.refreshToken);
      try {
        const nextUser = mapApiUser(data.user, user ?? undefined);
        const savedEvents = await fetchSavedEventIds().catch(() => nextUser.savedEvents);
        await persistUser({ ...nextUser, savedEvents });
      } catch (error) {
        await clearToken();
        throw error;
      }
      setPendingSignup(null);
      setPendingOTPContext(null);
      return true;
    },
    [persistUser, signInWithPhoneSession, user]
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
        const path = `/api/v1/events/${encodeURIComponent(eventId)}/save`;
        if (isSaved) {
          await api.delete<{ eventId: string; saved: boolean }>(path);
        } else {
          await api.post<{ eventId: string; saved: boolean }>(path);
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
      if (
        data.phone !== undefined &&
        data.phone.replace(/\D/g, "") !== (user.phone ?? "").replace(/\D/g, "")
      ) {
        throw new Error("Phone numbers cannot be changed through profile editing.");
      }

      const fields: Record<string, string> = {};
      if (data.username !== undefined) fields.displayName = data.username;
      if ("email" in data) fields.email = data.email ?? "null";
      if ("bio" in data) fields.bio = data.bio ?? "null";
      if ("location" in data) fields.location = data.location ?? "null";

      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.append(key, value);

      const avatarUri = data.avatarUrl;
      if (avatarUri !== undefined && avatarUri !== user.avatarUrl) {
        if (!/^(file|content|blob):/i.test(avatarUri)) {
          throw new Error("Choose a profile photo from this device to upload it.");
        }
        const image = await fetch(avatarUri);
        if (!image.ok) throw new Error("We couldn't read the selected profile photo.");
        form.append("avatar_image", await image.blob(), "avatar.jpg");
      }

      if (Object.keys(fields).length === 0 && !form.has("avatar_image")) {
        throw new Error("There are no supported profile changes to save.");
      }

      const resp = await api.patchForm<ApiUser>("/api/v1/users/me", form);
      await persistUser(mapApiUser(resp, user));
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
        resendSignupOTP,
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
