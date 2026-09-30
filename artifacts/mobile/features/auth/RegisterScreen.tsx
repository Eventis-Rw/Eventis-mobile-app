import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type Mode = "login" | "register";

export default function RegisterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("register");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "register" && !username.trim()) e.username = "Username required";
    if (!email.trim() || !email.includes("@")) e.email = "Valid email required";
    if (!password || password.length < 6) e.password = "Min 6 characters";
    if (mode === "register" && !termsAccepted) e.terms = "Please accept terms";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register({ username, email, phone: phone || undefined, password });
      }
      router.replace("/(tabs)" as any);
    } catch (err) {
      setErrors({ general: "Something went wrong. Please try again." });
    }
    setLoading(false);
  };

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View
        className="flex-row items-center gap-3.5 border-b border-border bg-background px-5 pb-4 dark:border-border-dark dark:bg-background-dark"
        style={{ paddingTop: insets.top + 8 }}
      >
        <Pressable onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View className="flex-1 flex-row rounded-xl bg-secondary p-1 dark:bg-secondary-dark">
          {(["register", "login"] as Mode[]).map((m) => (
            <Pressable
              key={m}
              className={`flex-1 items-center rounded-[10px] py-2 ${
                mode === m
                  ? "bg-card shadow-sm dark:bg-card-dark"
                  : ""
              }`}
              onPress={() => setMode(m)}
            >
              <Text
                className={`text-sm ${
                  mode === m
                    ? "font-semibold text-foreground dark:text-foreground-dark"
                    : "font-sans text-muted-foreground dark:text-muted-foreground-dark"
                }`}
              >
                {m === "register" ? "Create Account" : "Sign In"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Animated.View
          entering={Platform.OS !== "web" ? FadeInDown.delay(100).springify() : undefined}
        >
          <Text className="mb-1.5 font-bold text-[28px] text-foreground dark:text-foreground-dark">
            {mode === "register" ? "Join Eventis" : "Welcome back"}
          </Text>
          <Text className="font-sans text-[15px] leading-[22px] text-muted-foreground dark:text-muted-foreground-dark">
            {mode === "register"
              ? "Create your account and start discovering events"
              : "Sign in to access your tickets and saved events"}
          </Text>
        </Animated.View>

        {errors.general && (
          <View className="flex-row items-center gap-2 rounded-xl border border-destructive bg-destructive/10 p-3">
            <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
            <Text className="flex-1 font-sans text-sm text-destructive">
              {errors.general}
            </Text>
          </View>
        )}

        {mode === "register" && (
          <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(160).springify() : undefined}>
            <FieldLabel label="Username" />
            <InputField
              value={username}
              onChange={setUsername}
              placeholder="Choose a username"
              icon="person-outline"
              error={errors.username}
            />
          </Animated.View>
        )}

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(200).springify() : undefined}>
          <FieldLabel label="Email address" />
          <InputField
            value={email}
            onChange={setEmail}
            placeholder="your@email.com"
            icon="mail-outline"
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </Animated.View>

        {mode === "register" && (
          <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(240).springify() : undefined}>
            <FieldLabel label="Phone number (optional)" />
            <InputField
              value={phone}
              onChange={setPhone}
              placeholder="+44 7xxx xxxxxx"
              icon="phone-portrait-outline"
              keyboardType="phone-pad"
            />
          </Animated.View>
        )}

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(280).springify() : undefined}>
          <FieldLabel label="Password" />
          <View className="relative">
            <InputField
              value={password}
              onChange={setPassword}
              placeholder="At least 6 characters"
              icon="lock-closed-outline"
              secureTextEntry={!showPassword}
              error={errors.password}
            />
            <Pressable
              className="absolute right-3.5 top-[15px]"
              onPress={() => setShowPassword((p) => !p)}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>
        </Animated.View>

        {mode === "register" && (
          <Animated.View
            entering={Platform.OS !== "web" ? FadeInDown.delay(320).springify() : undefined}
            className="flex-row items-start gap-3"
          >
            <Pressable
              className={`mt-px h-[22px] w-[22px] items-center justify-center rounded-md border-[1.5px] ${
                termsAccepted
                  ? "border-primary bg-primary"
                  : "border-border bg-transparent dark:border-border-dark"
              }`}
              onPress={() => setTermsAccepted((p) => !p)}
            >
              {termsAccepted && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </Pressable>
            <Text className="flex-1 font-sans text-sm leading-[22px] text-muted-foreground dark:text-muted-foreground-dark">
              I agree to the{" "}
              <Text className="font-medium text-primary">
                Terms of Service
              </Text>{" "}
              and{" "}
              <Text className="font-medium text-primary">
                Privacy Policy
              </Text>
            </Text>
          </Animated.View>
        )}

        {errors.terms && (
          <Text className="font-sans text-xs text-destructive">
            {errors.terms}
          </Text>
        )}

        <Animated.View entering={Platform.OS !== "web" ? FadeInDown.delay(360).springify() : undefined}>
          <Pressable
            className="mt-2 items-center rounded-2xl bg-primary py-[18px]"
            style={{ opacity: loading ? 0.75 : 1 }}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text className="font-bold text-[17px] text-primary-foreground">
              {loading ? "Please wait..." : mode === "register" ? "Create Account" : "Sign In"}
            </Text>
          </Pressable>
        </Animated.View>

        <Text className="text-center font-sans text-sm text-muted-foreground dark:text-muted-foreground-dark">
          {mode === "register" ? "Already have an account? " : "Don't have an account? "}
          <Text
            className="font-semibold text-primary"
            onPress={() => setMode(mode === "register" ? "login" : "register")}
          >
            {mode === "register" ? "Sign in" : "Create one"}
          </Text>
        </Text>
      </KeyboardAwareScrollView>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  return (
    <Text className="mb-2 font-medium text-sm text-foreground dark:text-foreground-dark">
      {label}
    </Text>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  icon,
  error,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: string;
  error?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const colors = useColors();
  return (
    <>
      <View
        className={`mb-1 flex-row items-center gap-3 rounded-[14px] border bg-input px-3.5 py-3.5 dark:bg-input-dark ${
          error
            ? "border-destructive"
            : "border-border dark:border-border-dark"
        }`}
      >
        <Ionicons name={icon as any} size={18} color={colors.mutedForeground} />
        <TextInput
          className="flex-1 font-sans text-[15px] text-foreground dark:text-foreground-dark"
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "sentences"}
        />
      </View>
      {error && (
        <Text className="mb-2 font-sans text-xs text-destructive">{error}</Text>
      )}
    </>
  );
}
