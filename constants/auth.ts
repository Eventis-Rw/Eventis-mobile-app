/** Temporary demo authentication. Set to false when the PIN API is connected. */
export const DEMO_AUTH = process.env.EXPO_PUBLIC_DEMO_AUTH !== "false";
export const OTP_LENGTH = 6;
export type LoginInput = { phone: string; pin: string };
export type SignupInput = LoginInput & { username: string };
