import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { OTP_LENGTH } from "@/constants/auth";

import { useColors } from "@/hooks/useColors";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
}

export function OTPInput({ length = OTP_LENGTH, onComplete, error }: OTPInputProps) {
  const colors = useColors();
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""));
  const [focused, setFocused] = useState(-1);
  const inputs = useRef<(TextInput | null)[]>([]);
  const shakeValue = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeValue.value }],
  }));

  const shake = useCallback(() => {
    shakeValue.value = withSequence(
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, [shakeValue]);

  React.useEffect(() => {
    if (error) shake();
  }, [error, shake]);

  const handleChange = useCallback(
    (text: string, index: number) => {
      const digits = text.replace(/[^0-9]/g, "").slice(0, length);
      const newOtp = [...otp];
      const start = digits.length === length ? 0 : index;
      if (!digits) newOtp[index] = "";
      else digits.split("").forEach((digit, offset) => {
        if (start + offset < length) newOtp[start + offset] = digit;
      });
      setOtp(newOtp);

      if (digits) {
        inputs.current[Math.min(start + digits.length, length - 1)]?.focus();
      }

      const fullCode = newOtp.join("");
      if (fullCode.length === length && !newOtp.includes("")) {
        onComplete(fullCode);
      }
    },
    [otp, length, onComplete]
  );

  const handleKeyPress = useCallback(
    ({ nativeEvent }: { nativeEvent: { key: string } }, index: number) => {
      if (nativeEvent.key === "Backspace") {
        if (!otp[index] && index > 0) {
          const newOtp = [...otp];
          newOtp[index - 1] = "";
          setOtp(newOtp);
          inputs.current[index - 1]?.focus();
        } else {
          const newOtp = [...otp];
          newOtp[index] = "";
          setOtp(newOtp);
        }
      }
    },
    [otp]
  );

  return (
    <Animated.View style={[styles.container, shakeStyle]}>
      {Array(length)
        .fill(null)
        .map((_, i) => {
          const isFocused = focused === i;
          const hasValue = !!otp[i];
          return (
            <View
              key={i}
              style={[
                styles.cell,
                {
                  backgroundColor: colors.card,
                  borderColor: error
                    ? colors.destructive
                    : isFocused
                    ? colors.primary
                    : hasValue
                    ? colors.secondary
                    : colors.border,
                  borderWidth: isFocused ? 2 : 1,
                },
              ]}
            >
              <TextInput
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                style={[
                  styles.input,
                  { color: colors.foreground },
                ]}
                value={otp[i]}
                onChangeText={(t) => handleChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocused(i)}
                onBlur={() => setFocused(-1)}
                keyboardType="number-pad"
                maxLength={length}
                accessibilityLabel={`Verification digit ${i + 1} of ${length}`}
                selectTextOnFocus
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === "android" ? "sms-otp" : "one-time-code"}
                caretHidden
              />
            </View>
          );
        })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    maxWidth: 400,
    justifyContent: "center",
  },
  cell: {
    flex: 1,
    minWidth: 0,
    height: 58,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    width: "100%",
    height: "100%",
    paddingHorizontal: 0,
  },
});
