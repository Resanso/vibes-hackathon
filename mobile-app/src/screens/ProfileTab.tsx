import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, SafeAreaView, ScrollView, Text, View } from "react-native";
import { Calendar1, CreditCard, Phone, Send, User, Users, Wallet } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import {
  ApiError,
  debugCreateDueEntry,
  getProfile,
  setNotificationChannel,
  triggerReminders,
  type NotificationChannel,
  type Profile,
} from "../api/client";
import { SecondaryButton } from "../components/SecondaryButton";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { StatusToast } from "../components/StatusToast";
import { colors } from "../theme/colors";
import type { MainTabParamList } from "../navigation/MainTabNavigator";
import type { RootStackParamList } from "../navigation/RootNavigator";
import { useSessionStore } from "../store/sessionStore";

// The actual bot registered for this project via @BotFather — see
// telegram-service/CLAUDE.md. Hardcoded since there's only ever one bot for
// this product, same reasoning as brand tokens being hardcoded in theme/.
const TELEGRAM_BOT_USERNAME = "nera70_bot";

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3" style={{ gap: 12 }}>
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 36, height: 36, backgroundColor: `${colors.primary}1F` }}
      >
        <Icon color={colors.primary} size={18} />
      </View>
      <View style={{ flex: 1 }}>
        <Text className="font-body text-xs text-neutral" style={{ opacity: 0.5 }}>
          {label}
        </Text>
        <Text className="font-heading text-sm text-neutral">{value}</Text>
      </View>
    </View>
  );
}

type Props = BottomTabScreenProps<MainTabParamList, "Profil">;

// Real data from profile.get — not a mock. Shows exactly what the student
// entered in FinancialSurvivalCheck; there's no separate "edit profile" flow
// yet, so this is read-only.
export function ProfileTab({ navigation }: Props) {
  const phone = useSessionStore((state) => state.phone);
  const name = useSessionStore((state) => state.name);
  const clearSession = useSessionStore((state) => state.clearSession);
  const markOnboardingIncomplete = useSessionStore((state) => state.markOnboardingIncomplete);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<
    { variant: "success" | "error"; message: string } | null
  >(null);
  const [switchingChannel, setSwitchingChannel] = useState(false);
  const [channelResult, setChannelResult] = useState<
    { variant: "success" | "error"; message: string } | null
  >(null);
  const [creatingDueEntry, setCreatingDueEntry] = useState(false);
  const [dueEntryResult, setDueEntryResult] = useState<
    { variant: "success" | "error"; message: string } | null
  >(null);

  // Testing-only: creates a RiskEntry due tomorrow so "Kirim reminder
  // cicilan sekarang" below has something to actually send, without
  // widening REMINDER_WINDOW_DAYS on either messaging service.
  async function handleCreateDueEntry() {
    if (!phone) return;
    setCreatingDueEntry(true);
    setDueEntryResult(null);
    try {
      await debugCreateDueEntry(phone);
      setDueEntryResult({
        variant: "success",
        message: "Cicilan dummy jatuh tempo besok berhasil dibuat.",
      });
    } catch {
      setDueEntryResult({
        variant: "error",
        message: "Gagal membuat cicilan dummy. Coba lagi sebentar lagi.",
      });
    } finally {
      setCreatingDueEntry(false);
    }
  }

  async function handleTriggerReminders() {
    const channel = profile?.notificationChannel ?? "whatsapp";
    setTriggering(true);
    setTriggerResult(null);
    try {
      const { sent } = await triggerReminders(channel);
      setTriggerResult({
        variant: "success",
        message:
          sent > 0
            ? `Berhasil, ${sent} reminder cicilan dikirim.`
            : "Berhasil dijalankan, tidak ada cicilan yang jatuh tempo saat ini.",
      });
    } catch {
      setTriggerResult({
        variant: "error",
        message: `Gagal memicu reminder. Pastikan ${channel}-service aktif.`,
      });
    } finally {
      setTriggering(false);
    }
  }

  async function handleSwitchChannel(channel: NotificationChannel) {
    if (!phone || !profile || channel === profile.notificationChannel) return;

    if (channel === "telegram" && !profile.telegramChatId) {
      setChannelResult({
        variant: "error",
        message: `Link akun Telegram dulu: buka @${TELEGRAM_BOT_USERNAME} di Telegram, kirim /start, lalu bagikan nomor teleponmu.`,
      });
      return;
    }

    setSwitchingChannel(true);
    setChannelResult(null);
    try {
      const updated = await setNotificationChannel(phone, channel);
      setProfile(updated);
      setChannelResult({
        variant: "success",
        message:
          channel === "telegram"
            ? "Reminder & quick consult sekarang lewat Telegram."
            : "Reminder & quick consult sekarang lewat WhatsApp.",
      });
    } catch (error) {
      setChannelResult({
        variant: "error",
        message:
          error instanceof ApiError && error.code === "PRECONDITION_FAILED"
            ? error.message
            : "Gagal beralih channel. Coba lagi sebentar lagi.",
      });
    } finally {
      setSwitchingChannel(false);
    }
  }

  function handleOpenTelegramBot() {
    void Linking.openURL(`https://t.me/${TELEGRAM_BOT_USERNAME}`);
  }

  // Clears the local session so the app boots back into Login. The backend
  // account itself isn't touched: logging back in with the same
  // email/password immediately resumes at MainTabs (since
  // onboardingCompletedAt is still set server-side) — this is NOT how to
  // revisit onboarding, see handleResetOnboarding below for that.
  async function handleLogout() {
    await clearSession();
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  // Testing-only: stays logged in, just flips onboardingCompletedAt to null
  // locally (see markOnboardingIncomplete) and jumps straight to
  // FinancialSurvivalCheck so the onboarding steps can be filled again.
  // Submitting FinancialSurvivalCheck again re-sets onboardingCompletedAt
  // server-side, same as the first time through.
  function handleResetOnboarding() {
    markOnboardingIncomplete();
    navigation
      .getParent<NativeStackNavigationProp<RootStackParamList>>()
      ?.reset({ index: 0, routes: [{ name: "FinancialSurvivalCheck" }] });
  }

  useEffect(() => {
    if (!phone) return;
    getProfile(phone)
      .then(setProfile)
      .catch((error) => {
        setErrorMessage(
          error instanceof ApiError
            ? "Gagal memuat profil. Coba lagi sebentar lagi."
            : "Tidak bisa terhubung ke server. Cek koneksi internetmu.",
        );
      })
      .finally(() => setLoading(false));
  }, [phone]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        className="flex-1 px-6 py-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 32 }}
      >
        <View
          className="items-center rounded-2xl px-6 py-8"
          style={{ backgroundColor: `${colors.primary}0D`, gap: 12 }}
        >
          <View
            className="items-center justify-center rounded-full"
            style={{ width: 64, height: 64, backgroundColor: `${colors.primary}26` }}
          >
            <User color={colors.primary} size={28} />
          </View>
          <Text className="font-display text-neutral" style={{ fontSize: 20 }}>
            {name ?? "Pengguna Nera"}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} testID="profile-loading" />
        ) : errorMessage ? (
          <Text className="font-body text-neutral" style={{ color: colors.error }}>
            {errorMessage}
          </Text>
        ) : (
          <View className="rounded-2xl border px-4" style={{ borderColor: "#CBD5E1" }}>
            <InfoRow icon={Phone} label="Nomor WhatsApp" value={phone ?? "-"} />
            <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />
            <InfoRow
              icon={Wallet}
              label="Pemasukan bulanan"
              value={profile ? formatRupiah(profile.monthlyIncome) : "-"}
            />
            <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />
            <InfoRow
              icon={CreditCard}
              label="Cicilan/utang bulanan"
              value={profile ? formatRupiah(profile.existingMonthlyDebt) : "-"}
            />
            <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />
            <InfoRow
              icon={Users}
              label="Jumlah tanggungan"
              value={profile ? `${profile.dependents}` : "-"}
            />
            <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />
            <InfoRow
              icon={Calendar1}
              label="Terakhir diperbarui"
              value={profile ? formatDate(profile.updatedAt) : "-"}
            />
          </View>
        )}

        {profile ? (
          <View className="rounded-2xl border px-4 py-4" style={{ borderColor: "#CBD5E1", gap: 12 }}>
            <Text className="font-heading text-sm text-neutral" style={{ opacity: 0.5 }}>
              Channel Notifikasi
            </Text>
            <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
              Reminder cicilan & jawaban /cek dikirim lewat channel yang aktif. Deteksi teror
              pinjol tetap lewat WhatsApp berapa pun channel yang dipilih di sini.
            </Text>

            <SegmentedToggle
              options={[
                { value: "whatsapp", label: "WhatsApp", testID: "channel-whatsapp-button" },
                { value: "telegram", label: "Telegram", testID: "channel-telegram-button" },
              ]}
              value={profile.notificationChannel}
              onChange={handleSwitchChannel}
              disabled={switchingChannel}
            />

            {!profile.telegramChatId ? (
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Send color={colors.secondary} size={16} />
                <Text
                  className="flex-1 font-body text-xs text-secondary"
                  onPress={handleOpenTelegramBot}
                  style={{ textDecorationLine: "underline" }}
                >
                  Belum link Telegram — buka @{TELEGRAM_BOT_USERNAME} dan kirim /start
                </Text>
              </View>
            ) : null}

            {channelResult ? (
              <StatusToast
                message={channelResult.message}
                variant={channelResult.variant === "success" ? "success" : "error"}
                onDismiss={() => setChannelResult(null)}
              />
            ) : null}
          </View>
        ) : null}

        <View className="rounded-2xl border px-4 py-4" style={{ borderColor: "#CBD5E1", gap: 12 }}>
          <Text className="font-heading text-sm text-neutral" style={{ opacity: 0.5 }}>
            Testing
          </Text>
          <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
            Belum ada cicilan yang jatuh tempo? Buat satu dummy dulu (jatuh tempo besok),
            baru picu reminder-nya.
          </Text>
          <SecondaryButton
            label={creatingDueEntry ? "Membuat..." : "Buat cicilan jatuh tempo (debug)"}
            onPress={handleCreateDueEntry}
            disabled={creatingDueEntry}
            testID="debug-create-due-entry-button"
          />
          {dueEntryResult ? (
            <StatusToast
              message={dueEntryResult.message}
              variant={dueEntryResult.variant === "success" ? "success" : "error"}
              onDismiss={() => setDueEntryResult(null)}
            />
          ) : null}

          <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />

          <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
            Picu pengecekan reminder cicilan sekarang lewat channel yang aktif, tanpa
            menunggu jadwal harian otomatis.
          </Text>
          <SecondaryButton
            label={triggering ? "Mengirim..." : "Kirim reminder cicilan sekarang"}
            onPress={handleTriggerReminders}
            disabled={triggering}
            testID="trigger-reminders-button"
          />
          {triggerResult ? (
            <StatusToast
              message={triggerResult.message}
              variant={triggerResult.variant === "success" ? "success" : "error"}
              onDismiss={() => setTriggerResult(null)}
            />
          ) : null}

          <View style={{ height: 1, backgroundColor: "#E2E8F0" }} />

          <Text className="font-body text-sm text-neutral" style={{ opacity: 0.7 }}>
            Isi ulang data onboarding dari awal (tetap login, tidak sama
            dengan Keluar).
          </Text>
          <SecondaryButton
            label="Reset Onboarding"
            onPress={handleResetOnboarding}
            testID="reset-onboarding-button"
          />
        </View>

        <View className="rounded-2xl border px-4 py-4" style={{ borderColor: "#CBD5E1", gap: 12 }}>
          <Text className="font-heading text-sm text-neutral" style={{ opacity: 0.5 }}>
            Akun
          </Text>
          <SecondaryButton
            label="Keluar"
            onPress={handleLogout}
            testID="logout-button"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
