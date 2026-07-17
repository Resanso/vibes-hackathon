import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BookOpen, CircleUser, CirclePlus, Compass, House, MessageCircle } from "lucide-react-native";

import { SafetyDashboard } from "../screens/SafetyDashboard";
import { AlternativesTab } from "../screens/AlternativesTab";
import { NerAIScreen } from "../screens/NerAIScreen";
import { ProfileTab } from "../screens/ProfileTab";
import { colors } from "../theme/colors";

export type MainTabParamList = {
  Beranda: undefined;
  CekBaru: undefined; // never rendered — tabPress is intercepted below
  Alternatif: undefined;
  Edukasi: undefined;
  Profil: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

// A placeholder for the "Cek Baru" tab's content, since tabPress is always
// intercepted (see the listener below) before this ever renders.
function CekBaruPlaceholder() {
  return null;
}

// Persistent home after onboarding — not in the design reference visually
// (that used a different tab bar style), but the 5 tabs it specifies:
// Beranda (SafetyDashboard, real data), Cek Baru (re-triggers
// BorrowingScenario→FinancialRiskIntelligence without redoing
// FinancialSurvivalCheck), Alternatif (DecisionSupport's list, standalone),
// Edukasi (placeholder, no content model yet), Profil (real profile.get data).
export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: `${colors.neutral}66`,
      }}
    >
      <Tab.Screen
        name="Beranda"
        component={SafetyDashboard}
        options={{
          tabBarIcon: ({ color, size }) => <House color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="CekBaru"
        component={CekBaruPlaceholder}
        options={{
          tabBarLabel: "Cek Baru",
          tabBarIcon: ({ color, size }) => <CirclePlus color={color} size={size} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent()?.navigate("BorrowingScenario", { standalone: true });
          },
        })}
      />
      <Tab.Screen
        name="Alternatif"
        component={AlternativesTab}
        options={{
          tabBarIcon: ({ color, size }) => <Compass color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Edukasi"
        component={NerAIScreen}
        options={{
          tabBarLabel: "NerAI",
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileTab}
        options={{
          tabBarIcon: ({ color, size }) => <CircleUser color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}
