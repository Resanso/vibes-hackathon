import "react-native-gesture-handler";
import { useCallback, useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, type LinkingOptions } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import "./global.css";
import { RootNavigator } from "./src/navigation/RootNavigator";
import type { RootStackParamList } from "./src/navigation/RootNavigator";
import { useSessionStore } from "./src/store/sessionStore";

void SplashScreen.preventAutoHideAsync();

// Only PinjolBlocked is deep-linkable — the nera:// scheme is used
// exclusively by PinjolBlockerAccessibilityService to bring this screen to
// the foreground (see modules/pinjol-blocker), not a general-purpose
// linking setup for the rest of the app.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["nera://"],
  config: {
    screens: {
      PinjolBlocked: "blocked",
    },
  },
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const phone = useSessionStore((state) => state.phone);
  const isRestoring = useSessionStore((state) => state.isRestoring);
  const onboardingCompletedAt = useSessionStore((state) => state.onboardingCompletedAt);
  const restoreSession = useSessionStore((state) => state.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const ready = fontsLoaded && !isRestoring;

  const onReady = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  // Decided once, after restoreSession() has resolved: no session -> Login;
  // logged in but never finished FinancialSurvivalCheck -> resume there;
  // logged in and already onboarded -> straight to the dashboard, no
  // repeated onboarding on every launch.
  const initialRouteName: keyof RootStackParamList = !phone
    ? "Login"
    : onboardingCompletedAt
      ? "MainTabs"
      : "FinancialSurvivalCheck";

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer onReady={onReady} linking={linking}>
        <RootNavigator initialRouteName={initialRouteName} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
