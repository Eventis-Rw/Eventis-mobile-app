// OAuth client IDs are public identifiers. Provider secrets belong on the API.
module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const iosUrlScheme = iosClientId?.endsWith(".apps.googleusercontent.com")
    ? `com.googleusercontent.apps.${iosClientId.slice(0, -".apps.googleusercontent.com".length)}`
    : undefined;
  return {
    ...config,
    ios: { ...config.ios, usesAppleSignIn: true },
    plugins: [
      ...(config.plugins ?? []),
      "expo-apple-authentication",
      ...(iosUrlScheme
        ? [["@react-native-google-signin/google-signin", { iosUrlScheme }]]
        : []),
    ],
  };
};
