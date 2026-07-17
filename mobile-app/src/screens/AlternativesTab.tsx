import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Construction, GraduationCap } from "lucide-react-native";

import { ApiError, listScholarships, type Scholarship } from "../api/client";
import { ListItemCard } from "../components/ListItemCard";
import { SegmentedToggle } from "../components/SegmentedToggle";
import { colors } from "../theme/colors";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// "Baru saja" / "X jam lalu" / "X hari lalu" — coarse enough for a dashboard
// freshness stat, not a general-purpose relative-time formatter.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  if (diffHours < 1) return "Baru saja";
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} hari lalu`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-1 rounded-2xl border px-3 py-4"
      style={{ borderColor: "#CBD5E1", gap: 4 }}
    >
      <Text className="font-body text-xs text-neutral" style={{ opacity: 0.6 }}>
        {label}
      </Text>
      <Text className="font-heading text-neutral" style={{ fontSize: 18 }}>
        {value}
      </Text>
    </View>
  );
}

// The dashboard-style default view of the "Alternatif" tab — real data from
// backend's scholarships.list (see scholarshipScraper.ts), not seed/mock.
// Nera only links out to the source's real application page
// (Linking.openURL below); it never fills out or submits an application on
// the student's behalf.
function ScholarshipDashboard() {
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    listScholarships()
      .then(setScholarships)
      .catch((error) => {
        setErrorMessage(
          error instanceof ApiError
            ? "Gagal memuat info beasiswa. Coba lagi sebentar lagi."
            : "Tidak bisa terhubung ke server. Cek koneksi internetmu.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <ActivityIndicator color={colors.primary} testID="at-scholarships-loading" />;
  }

  if (errorMessage) {
    return (
      <Text className="font-body text-neutral" style={{ color: colors.error }}>
        {errorMessage}
      </Text>
    );
  }

  if (scholarships.length === 0) {
    return (
      <View
        className="rounded-2xl border px-4 py-6"
        style={{ borderColor: "#CBD5E1" }}
        testID="at-scholarships-empty"
      >
        <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
          Belum ada data beasiswa yang tersimpan.
        </Text>
      </View>
    );
  }

  const mostRecentScrapedAt = scholarships.reduce(
    (latest, item) => (item.scrapedAt > latest ? item.scrapedAt : latest),
    scholarships[0]!.scrapedAt,
  );

  return (
    <View style={{ gap: 16 }}>
      <View className="flex-row" style={{ gap: 12 }} testID="at-scholarships-stats">
        <StatTile label="Beasiswa Aktif" value={`${scholarships.length}`} />
        <StatTile label="Diperbarui" value={formatRelativeTime(mostRecentScrapedAt)} />
      </View>

      <View style={{ gap: 12 }}>
        {scholarships.map((item) => (
          <ListItemCard
            key={item.id}
            testID={`at-scholarship-${item.id}`}
            icon={GraduationCap}
            iconTint={`${colors.primary}1F`}
            iconColor={colors.primary}
            title={item.title}
            description={`${item.summary}\n${item.sourceName} · ${formatDate(item.publishedAt)}`}
            onPress={() => {
              void Linking.openURL(item.sourceUrl);
            }}
          />
        ))}
      </View>
    </View>
  );
}

// Deliberately blank-ish, not the old hardcoded RECOMMENDATIONS seed list
// (dana darurat kampus, koperasi mahasiswa, dsb — see backend's
// recommendations.ts: "no live institutional partners integrated yet").
// Showing fabricated partner content next to Beasiswa's real scraped data
// would misrepresent it as equally live. This tab stays reachable — so the
// nav slot/switch exists for when real partner data lands — but honest
// about not being ready yet instead of pretending with placeholder content.
function OtherAlternativesComingSoon() {
  return (
    <View className="items-center px-4 py-12" style={{ gap: 16 }} testID="at-other-coming-soon">
      <View
        className="items-center justify-center rounded-full"
        style={{ width: 64, height: 64, backgroundColor: `${colors.secondary}1F` }}
      >
        <Construction color={colors.secondary} size={28} />
      </View>
      <Text className="font-heading text-center text-neutral" style={{ fontSize: 16 }}>
        Segera Hadir
      </Text>
      <Text
        className="font-body text-center text-neutral"
        style={{ opacity: 0.7, lineHeight: 20 }}
      >
        Alternatif lain seperti koperasi mahasiswa, dana darurat kampus, dan cicilan
        0% sedang kami siapkan — belum ada mitra institusi yang benar-benar
        terintegrasi, jadi belum kami tampilkan sebagai pilihan nyata.
      </Text>
    </View>
  );
}

type AlternativesView = "beasiswa" | "lainnya";

// Standalone "Alternatif" tab. Beasiswa (real, scraped data) is the default
// dashboard view; "Lainnya" is demoted behind a toggle and shows an honest
// coming-soon state instead of the old hardcoded seed list — see
// OtherAlternativesComingSoon's comment for why. The onboarding step
// (DecisionSupport.tsx) still shows RecommendationList as-is; only this
// persistent tab was restructured.
export function AlternativesTab() {
  const [view, setView] = useState<AlternativesView>("beasiswa");

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* No insets.bottom — the bottom tab bar already reserves its own
          safe-area-bottom space, see SafetyDashboard.tsx's comment. */}
      <ScrollView
        className="flex-1 px-6 pt-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 24 }}
      >
        <View style={{ gap: 8 }}>
          <Text className="font-display text-neutral" style={{ fontSize: 24 }}>
            Alternatif yang Lebih Aman
          </Text>
          <Text className="font-body text-neutral" style={{ opacity: 0.7 }}>
            Pilihan non-cicilan dan non-pinjol, lebih ringan dari pinjol.
          </Text>
        </View>

        <SegmentedToggle
          options={[
            { value: "beasiswa", label: "Beasiswa", testID: "at-view-beasiswa" },
            { value: "lainnya", label: "Lainnya", testID: "at-view-lainnya" },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "beasiswa" ? <ScholarshipDashboard /> : <OtherAlternativesComingSoon />}
      </ScrollView>
    </SafeAreaView>
  );
}
