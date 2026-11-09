/** Opt into local demo authentication explicitly; backend auth is the default. */
export const DEMO_AUTH = process.env.EXPO_PUBLIC_DEMO_AUTH === "true";
export const OTP_LENGTH = 6;
export type LoginInput = { phone: string; pin: string };
export type SignupInput = LoginInput & { username: string };
