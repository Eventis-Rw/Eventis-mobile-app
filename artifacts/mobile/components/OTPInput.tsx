import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, onComplete, error }: OTPInputProps) {
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
      const digit = text.replace(/[^0-9]/g, "").slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);

      if (digit && index < length - 1) {
        inputs.current[index + 1]?.focus();
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
                maxLength={1}
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
    gap: 10,
    justifyContent: "center",
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    width: "100%",
    height: "100%",
    paddingHorizontal: 0,
  },
});
