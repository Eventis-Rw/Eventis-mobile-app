import Constants, { ExecutionEnvironment } from "expo-constants";
import React, { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type KeyboardAvoidingViewProps,
  type ScrollViewProps,
  type ViewProps,
} from "react-native";

type NativeKeyboardModule = typeof import("react-native-keyboard-controller");

type KeyboardState = { isVisible: boolean; height: number };

const useNativeModule =
  Platform.OS !== "web" &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

function loadNativeModule(): NativeKeyboardModule | null {
  if (!useNativeModule) return null;
  try {
    return require("react-native-keyboard-controller") as NativeKeyboardModule;
  } catch {
    return null;
  }
}

const native = loadNativeModule();

function useFallbackKeyboardState<T = KeyboardState>(
  selector?: (state: KeyboardState) => T,
): T {
  const [state, setState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
  });
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, (event) =>
      setState({ isVisible: true, height: event.endCoordinates.height }),
    );
    const hide = Keyboard.addListener(hideEvent, () =>
      setState({ isVisible: false, height: 0 }),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return selector ? selector(state) : (state as unknown as T);
}

type KeyboardProviderProps = React.PropsWithChildren<{
  statusBarTranslucent?: boolean;
  navigationBarTranslucent?: boolean;
  preserveEdgeToEdge?: boolean;
}>;

export const KeyboardProvider: React.ComponentType<KeyboardProviderProps> =
  (native?.KeyboardProvider ??
    (({ children }: KeyboardProviderProps) => <>{children}</>)) as React.ComponentType<KeyboardProviderProps>;

export const useKeyboardState: <T = KeyboardState>(
  selector?: (state: KeyboardState) => T,
) => T =
  (native?.useKeyboardState as unknown as typeof useFallbackKeyboardState) ??
  useFallbackKeyboardState;

type CompatKeyboardAvoidingViewProps = KeyboardAvoidingViewProps & {
  automaticOffset?: boolean;
};

export const KeyboardAvoidingView: React.ComponentType<CompatKeyboardAvoidingViewProps> =
  native?.KeyboardAvoidingView
    ? (native.KeyboardAvoidingView as unknown as React.ComponentType<CompatKeyboardAvoidingViewProps>)
    : (({ automaticOffset: _automaticOffset, ...props }) => (
        <RNKeyboardAvoidingView {...(props as KeyboardAvoidingViewProps)} />
      ));

export type CompatScrollViewProps = ScrollViewProps & {
  children?: React.ReactNode;
  bottomOffset?: number;
  extraKeyboardSpace?: number;
  disableScrollOnKeyboardHide?: boolean;
};

export function KeyboardAwareScrollView(props: CompatScrollViewProps) {
  const NativeScrollView = native?.KeyboardAwareScrollView as
    | React.ComponentType<CompatScrollViewProps>
    | undefined;
  if (NativeScrollView) return <NativeScrollView {...props} />;
  const {
    children,
    bottomOffset: _bottomOffset,
    extraKeyboardSpace: _extraKeyboardSpace,
    disableScrollOnKeyboardHide: _disableScrollOnKeyboardHide,
    ...rest
  } = props;
  return (
    <ScrollView keyboardShouldPersistTaps="handled" {...rest}>
      {children}
    </ScrollView>
  );
}

type CompatStickyViewProps = ViewProps & {
  offset?: { closed?: number; opened?: number };
};

export function KeyboardStickyView(props: CompatStickyViewProps) {
  const NativeStickyView = native?.KeyboardStickyView as
    | React.ComponentType<CompatStickyViewProps>
    | undefined;
  if (NativeStickyView) return <NativeStickyView {...props} />;
  const { offset: _offset, ...rest } = props;
  return <View {...rest} />;
}
