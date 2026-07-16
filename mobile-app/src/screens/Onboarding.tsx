import { useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  SafeAreaView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ShieldCheck, User, MessageCircle } from "lucide-react-native";

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
          <View style={{ gap: 28 }}>
            <Image
              source={require("../assets/nera-logo-horizontal.png")}
              style={{ width: 140, height: 44, alignSelf: "center" }}
              resizeMode="contain"
              accessibilityLabel="Nera"
            />

            <View style={{ gap: 8 }}>
              <Text className="text-center" style={{ fontSize: 26 }}>
                <Text className="font-display text-neutral">Pahami dulu, </Text>
                <Text className="font-display" style={{ color: colors.primary }}>
                  tenang kemudian.
                </Text>
              </Text>
              <Text className="text-center font-body text-neutral" style={{ opacity: 0.7 }}>
                Nera bantu kamu melihat risiko pinjaman sebelum ambil
                keputusan.
              </Text>
            </View>

            <View style={{ gap: 16 }}>
              <View style={{ gap: 6 }}>
                <Text className="font-heading text-sm text-neutral">
                  Nama (opsional)
                </Text>
                <View
                  className="flex-row items-center rounded-2xl border px-4"
                  style={{
                    borderColor: nameFocused ? colors.secondary : BORDER_GRAY,
                    gap: 10,
                  }}
                >
                  <User color={colors.neutral} size={18} style={{ opacity: 0.5 }} />
                  <TextInput
                    testID="onboarding-name-input"
                    value={name}
                    onChangeText={setName}
                    placeholder="Nama kamu"
                    placeholderTextColor="#94A3B8"
                    returnKeyType="next"
                    onSubmitEditing={() => phoneInputRef.current?.focus()}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    className="flex-1 py-3 font-body text-neutral"
                  />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text className="font-heading text-sm text-neutral">
                  Nomor WhatsApp
                </Text>
                <View
                  className="flex-row items-center rounded-2xl border px-4"
                  style={{
                    borderColor: phoneFocused ? colors.secondary : BORDER_GRAY,
                    gap: 10,
                  }}
                >
                  <MessageCircle color={colors.neutral} size={18} style={{ opacity: 0.5 }} />
                  <TextInput
                    ref={phoneInputRef}
                    testID="onboarding-phone-input"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="08123456789"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => setPhoneFocused(false)}
                    className="flex-1 py-3 font-body text-neutral"
                  />
                </View>
                <Text className="font-body text-xs" style={{ color: colors.neutral, opacity: 0.6 }}>
                  Dipakai untuk menyimpan progresmu dan pengingat lewat WhatsApp.
                </Text>
              </View>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <PrimaryButton
              testID="onboarding-start-button"
              label="Mulai"
              onPress={handleStart}
              disabled={!isPhoneValid}
            />
            <View className="flex-row items-center justify-center" style={{ gap: 6 }}>
              <ShieldCheck color={colors.neutral} size={14} style={{ opacity: 0.5 }} />
              <Text className="font-body text-xs text-neutral" style={{ opacity: 0.5 }}>
                Data kamu aman dan tidak disalahgunakan.
              </Text>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
