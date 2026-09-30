import React, { useCallback, useRef, useState } from "react";
import {
  Platform,
  TextInput,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  error?: boolean;
}

export function OTPInput({ length = 6, onComplete, error }: OTPInputProps) {
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
    <Animated.View
      className="flex-row justify-center gap-2.5"
      style={shakeStyle}
    >
      {Array(length)
        .fill(null)
        .map((_, i) => {
          const isFocused = focused === i;
          const hasValue = !!otp[i];
          const borderWidthClass = isFocused ? "border-2" : "border";
          const borderColorClass = error
            ? "border-destructive"
            : isFocused
            ? "border-primary"
            : hasValue
            ? "border-secondary dark:border-secondary-dark"
            : "border-border dark:border-border-dark";
          const borderClass = `${borderWidthClass} ${borderColorClass}`;

          return (
            <View
              key={i}
              className={`h-14 w-12 items-center justify-center rounded-xl bg-card dark:bg-card-dark ${borderClass}`}
            >
              <TextInput
                ref={(el) => {
                  inputs.current[i] = el;
                }}
                className="h-full w-full px-0 text-center font-bold text-[22px] text-foreground dark:text-foreground-dark"
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
