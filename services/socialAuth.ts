import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

export type SocialCredential = {
  provider: "google" | "apple";
  idToken: string;
  nonce?: string;
  username?: string;
};

export async function getGoogleCredential(): Promise<SocialCredential | null> {
  if (Platform.OS === "web")
    throw new Error("Google sign-in is available in the Eventis mobile app.");
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId?.trim()) {
    throw new Error(
      "Google sign-in is not configured yet. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in the mobile .env.local, restart Metro, and reload the app.",
    );
  }
  if (Platform.OS === "ios" && !process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
    throw new Error("Google sign-in on iOS is not configured yet.");
  }
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
    await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({
    webClientId,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  });
  try {
    if (Platform.OS === "android")
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    const result = await GoogleSignin.signIn();
    if (!isSuccessResponse(result)) return null;
    if (!result.data.idToken)
      throw new Error(
        "Google did not return a sign-in token. Please try again.",
      );
    return { provider: "google", idToken: result.data.idToken };
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED)
      return null;
    throw error;
  }
}

export async function getAppleCredential(): Promise<SocialCredential | null> {
  if (Platform.OS !== "ios")
    throw new Error("Apple sign-in is available on iOS.");
  const Apple = await import("expo-apple-authentication");
  const nonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce,
  );
  try {
    const credential = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!credential.identityToken)
      throw new Error(
        "Apple did not return a sign-in token. Please try again.",
      );
    const username = [
      credential.fullName?.givenName,
      credential.fullName?.familyName,
    ]
      .filter(Boolean)
      .join(" ")
      .slice(0, 60);
    return {
      provider: "apple",
      idToken: credential.identityToken,
      nonce,
      ...(username ? { username } : {}),
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ERR_REQUEST_CANCELED"
    )
      return null;
    throw error;
  }
}
