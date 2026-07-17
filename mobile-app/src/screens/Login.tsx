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
import { Lock, Mail } from "lucide-react-native";

import { ApiError, login } from "../api/client";
import { PrimaryButton } from "../components/PrimaryButton";
import { Field } from "./Register";
import { colors } from "../theme/colors";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function Login({ navigation }: Props) {
  const setSession = useSessionStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const isValid = email.includes("@") && password.length > 0;

  async function handleLogin() {
    if (!isValid || submitting) return;
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const { token, profile } = await login({ email: email.trim(), password });
      await setSession(profile, token);
      // A student who already finished FinancialSurvivalCheck before goes
      // straight to the dashboard — no need to redo an onboarding flow
      // they've already completed once.
      const nextRoute = profile.onboardingCompletedAt ? "MainTabs" : "FinancialSurvivalCheck";
      navigation.reset({ index: 0, routes: [{ name: nextRoute }] });
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

            <Text className="text-center font-display text-neutral" style={{ fontSize: 24 }}>
              Selamat datang kembali
            </Text>

            <View style={{ gap: 14 }}>
              <Field
                icon={Mail}
                testID="login-email-input"
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                keyboardType="email-address"
                focused={focusedField === "email"}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
              <Field
                icon={Lock}
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
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
              testID="login-submit-button"
              label={submitting ? "Masuk..." : "Masuk"}
              onPress={handleLogin}
              disabled={!isValid || submitting}
            />
            <Text
              testID="login-register-link"
              className="text-center font-body text-sm"
              style={{ color: colors.secondary }}
              onPress={() => navigation.navigate("Register")}
            >
              Belum punya akun? Daftar
            </Text>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
