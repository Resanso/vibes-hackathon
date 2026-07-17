import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShieldAlert } from "lucide-react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import { PINJOL_APPS } from "../constants/pinjolApps";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "PinjolBlocked">;

// Reached via a `nera://blocked?app=<packageName>` deep link launched by
// PinjolBlockerAccessibilityService — not a system SYSTEM_ALERT_WINDOW
// overlay drawn on top of the blocked app, just Nera's own screen brought to
// the foreground instead. See root .claude/rules/product-context.md's
// "Exception: consent-based pinjol app blocking" section.
export function PinjolBlockedScreen({ route, navigation }: Props) {
  const packageName = route.params?.app;
  const appLabel = PINJOL_APPS.find((app) => app.packageName === packageName)?.label ?? "aplikasi ini";

  // No `.getParent()` here, unlike ProfileTab's handleLogout — PinjolBlocked
  // is a direct screen of RootNavigator's own stack (same level as MainTabs,
  // not nested inside it), so `navigation` already IS the root stack.
  // `.getParent()` returned undefined and silently no-op'd the whole reset
  // via optional chaining — confirmed on-device 2026-07-17.
  function handleBackToHome() {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8" style={{ gap: 20 }}>
        <View
          className="items-center justify-center rounded-full"
          style={{ width: 72, height: 72, backgroundColor: `${colors.error}1F` }}
        >
          <ShieldAlert color={colors.error} size={36} />
        </View>

        <Text className="font-display text-center text-neutral" style={{ fontSize: 22 }}>
          {appLabel} Diblokir Sementara
        </Text>

        <Text
          className="font-body text-center text-neutral"
          style={{ opacity: 0.7, lineHeight: 22 }}
        >
          Nera mendeteksi kamu membuka {appLabel} saat mode pemblokiran testing aktif.
          Ini masih prototipe (proof-of-concept) — belum tersambung ke algoritma
          deteksi anomali yang sesungguhnya, jadi pemblokiran ini masih manual, bukan
          berdasarkan analisis risiko nyata.
        </Text>

        <PrimaryButton label="Kembali ke Beranda" onPress={handleBackToHome} testID="pinjol-blocked-back-button" />
      </View>
    </SafeAreaView>
  );
}
