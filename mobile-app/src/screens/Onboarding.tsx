import { useState } from "react";
import { SafeAreaView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

// Signature element: two overlapping low-opacity rings, echoing the circular
// motif RiskScoreGauge uses elsewhere — this product's visual fingerprint,
// not a generic logo mark.
function SignatureMark() {
  return (
    <View className="items-center justify-center" style={{ height: 140 }}>
      <View
        className="absolute rounded-full"
        style={{
          width: 140,
          height: 140,
          backgroundColor: colors.primary,
          opacity: 0.12,
        }}
      />
      <View
        className="absolute rounded-full"
        style={{
          width: 92,
          height: 92,
          backgroundColor: colors.secondary,
          opacity: 0.16,
        }}
      />
      <View
        className="rounded-full"
        style={{
          width: 56,
          height: 56,
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}

export function Onboarding({ navigation }: Props) {
  const setIdentity = useSessionStore((state) => state.setIdentity);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const isPhoneValid = phone.trim().length >= 9;

  const handleStart = () => {
    if (!isPhoneValid) return;
    setIdentity(phone.trim(), name.trim() || undefined);
    navigation.navigate("FinancialSurvivalCheck");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-between px-6 py-8">
        <View style={{ gap: 32 }}>
          <SignatureMark />

          <View style={{ gap: 8 }}>
            <Text className="font-display text-neutral" style={{ fontSize: 28 }}>
              Nera
            </Text>
            <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
              Lihat gambaran jelas dulu sebelum ambil keputusan pinjaman.
            </Text>
          </View>

          <View style={{ gap: 16 }}>
            <View style={{ gap: 6 }}>
              <Text className="font-heading text-sm text-neutral">
                Nama (opsional)
              </Text>
              <TextInput
                testID="onboarding-name-input"
                value={name}
                onChangeText={setName}
                placeholder="Nama kamu"
                placeholderTextColor="#475569"
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                className="rounded-2xl border-2 px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: nameFocused ? colors.secondary : colors.neutral,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text className="font-heading text-sm text-neutral">
                Nomor WhatsApp
              </Text>
              <TextInput
                testID="onboarding-phone-input"
                value={phone}
                onChangeText={setPhone}
                placeholder="08123456789"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                className="rounded-2xl border-2 px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: phoneFocused ? colors.secondary : colors.neutral,
                }}
              />
              <Text className="font-body text-xs" style={{ color: colors.neutral, opacity: 0.6 }}>
                Dipakai untuk menyimpan progresmu dan pengingat lewat WhatsApp.
              </Text>
            </View>
          </View>
        </View>

        <PrimaryButton
          testID="onboarding-start-button"
          label="Mulai"
          onPress={handleStart}
          disabled={!isPhoneValid}
        />
      </View>
    </SafeAreaView>
  );
}
