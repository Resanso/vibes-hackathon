// TEMPORARY component showcase — not the real app entry. Once screen-builder
// starts building actual screens (src/screens/, per mobile-app/CLAUDE.md),
// this gets replaced by React Navigation. This file exists right now purely
// to preview the 4 locked-token components together.
import { useCallback, useState } from "react";
import { SafeAreaView, ScrollView, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

import "./global.css";
import { PrimaryButton } from "./src/components/PrimaryButton";
import { SecondaryButton } from "./src/components/SecondaryButton";
import { RiskScoreGauge } from "./src/components/RiskScoreGauge";
import { StatusToast } from "./src/components/StatusToast";

void SplashScreen.preventAutoHideAsync();

export default function App() {
  const [toastVisible, setToastVisible] = useState(true);
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-white" onLayout={onLayout}>
      <StatusBar style="dark" />
      <ScrollView className="flex-1 px-6 py-8" contentContainerStyle={{ gap: 24 }}>
        <View style={{ gap: 12 }}>
          <PrimaryButton label="Lanjutkan" onPress={() => undefined} />
          <SecondaryButton label="Batal" onPress={() => undefined} />
        </View>

        <RiskScoreGauge score={72} label="Low Risk" level="success" />

        {toastVisible ? (
          <StatusToast
            message="Profil kamu berhasil disimpan."
            variant="success"
            onDismiss={() => setToastVisible(false)}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
