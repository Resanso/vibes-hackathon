import { useRef, useState } from "react";
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
import { Lock, Mail, ShieldCheck, User, MessageCircle } from "lucide-react-native";

import { ApiError, register } from "../api/client";
import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";

// Neutral UI-chrome gray for input borders — not part of the locked brand
// palette in colors.ts (that table is brand intent colors only), just a
// standard light border tone for a cleaner input look. Matches the
// treatment Onboarding used before this screen replaced it.
const BORDER_GRAY = "#CBD5E1";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

interface FieldProps {
  icon: typeof User;
  testID: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  inputRef?: React.Ref<TextInput>;
  keyboardType?: "default" | "phone-pad" | "email-address";
  secureTextEntry?: boolean;
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
}

export function Field({
  icon: Icon,
  testID,
  value,
  onChangeText,
  placeholder,
  focused,
  onFocus,
  onBlur,
  inputRef,
  keyboardType = "default",
  secureTextEntry = false,
  returnKeyType = "next",
  onSubmitEditing,
}: FieldProps) {
  return (
    <View
      className="flex-row items-center rounded-2xl border px-4"
      style={{ borderColor: focused ? colors.secondary : BORDER_GRAY, gap: 10 }}
    >
      <Icon color={colors.neutral} size={18} style={{ opacity: 0.5 }} />
      <TextInput
        ref={inputRef}
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={onFocus}
        onBlur={onBlur}
        autoCapitalize={keyboardType === "email-address" ? "none" : "words"}
        className="flex-1 py-3 font-body text-neutral"
      />
    </View>
  );
}

export function Register({ navigation }: Props) {
  const setSession = useSessionStore((state) => state.setSession);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const isValid =
    name.trim().length > 0 && phone.trim().length >= 9 && email.includes("@") && password.length >= 8;

  async function handleRegister() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { token, profile } = await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });
      await setSession(profile, token);
      navigation.reset({ index: 0, routes: [{ name: "FinancialSurvivalCheck" }] });
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Tidak bisa terhubung ke server. Cek koneksi internetmu.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View className="flex-1 justify-between px-6 py-8">
          <View style={{ gap: 20 }}>
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
                Nera bantu kamu melihat risiko pinjaman sebelum ambil keputusan.
              </Text>
            </View>

            <View style={{ gap: 14 }}>
              <Field
                icon={User}
                testID="register-name-input"
                value={name}
                onChangeText={setName}
                placeholder="Nama kamu"
                focused={focusedField === "name"}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => phoneRef.current?.focus()}
              />
              <Field
                icon={MessageCircle}
                testID="register-phone-input"
                value={phone}
                onChangeText={setPhone}
                placeholder="Nomor WhatsApp: 08123456789"
                keyboardType="phone-pad"
                focused={focusedField === "phone"}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
                inputRef={phoneRef}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <Field
                icon={Mail}
                testID="register-email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                focused={focusedField === "email"}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                inputRef={emailRef}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <Field
                icon={Lock}
                testID="register-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="Password (min. 8 karakter)"
                secureTextEntry
                returnKeyType="done"
                focused={focusedField === "password"}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                inputRef={passwordRef}
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            {errorMessage ? (
              <Text className="text-center font-body text-xs" style={{ color: colors.error }}>
                {errorMessage}
              </Text>
            ) : null}
          </View>

          <View style={{ gap: 12, paddingBottom: 24 }}>
            <PrimaryButton
              testID="register-submit-button"
              label={submitting ? "Mendaftar..." : "Daftar"}
              onPress={handleRegister}
              disabled={!isValid || submitting}
            />
            <Text
              testID="register-login-link"
              className="text-center font-body text-sm"
              style={{ color: colors.secondary }}
              onPress={() => navigation.navigate("Login")}
            >
              Sudah punya akun? Masuk
            </Text>
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
