import { useEffect, useRef, useState } from "react";
import {
  Keyboard,
  SafeAreaView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";
import { loadDraft, saveDraft } from "../utils/formDraft";

// Neutral UI-chrome gray for input borders — not part of the locked brand
// palette in colors.ts (that table is brand intent colors only), just a
// standard light border tone for a cleaner input look.
const BORDER_GRAY = "#CBD5E1";

type Props = NativeStackScreenProps<RootStackParamList, "Onboarding">;

interface Draft extends Record<string, string> {
  name: string;
  phone: string;
}

const DRAFT_KEY = "onboarding";

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
  const phoneInputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadDraft<Draft>(DRAFT_KEY).then((draft) => {
      if (draft.name !== undefined) setName(draft.name);
      if (draft.phone !== undefined) setPhone(draft.phone);
    });
  }, []);

  useEffect(() => {
    saveDraft<Draft>(DRAFT_KEY, { name, phone });
  }, [name, phone]);

  const isPhoneValid = phone.trim().length >= 9;

  const handleStart = () => {
    if (!isPhoneValid) return;
    setIdentity(phone.trim(), name.trim() || undefined);
    navigation.navigate("FinancialSurvivalCheck");
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                returnKeyType="next"
                onSubmitEditing={() => phoneInputRef.current?.focus()}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                className="rounded-2xl border px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: nameFocused ? colors.secondary : BORDER_GRAY,
                }}
              />
            </View>

            <View style={{ gap: 6 }}>
              <Text className="font-heading text-sm text-neutral">
                Nomor WhatsApp
              </Text>
              <TextInput
                ref={phoneInputRef}
                testID="onboarding-phone-input"
                value={phone}
                onChangeText={setPhone}
                placeholder="08123456789"
                placeholderTextColor="#475569"
                keyboardType="phone-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                className="rounded-2xl border px-4 py-3 font-body text-neutral"
                style={{
                  borderColor: phoneFocused ? colors.secondary : BORDER_GRAY,
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
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
