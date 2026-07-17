import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Login } from "../screens/Login";
import { Register } from "../screens/Register";
import { FinancialSurvivalCheck } from "../screens/FinancialSurvivalCheck";
import { BorrowingScenario } from "../screens/BorrowingScenario";
import { FinancialRiskIntelligence } from "../screens/FinancialRiskIntelligence";
import { DecisionSupport } from "../screens/DecisionSupport";
import { MainTabNavigator } from "./MainTabNavigator";
import type { RiskAssessment } from "../api/client";

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  FinancialSurvivalCheck: undefined;
  // standalone: true when reused from the "Cek Baru" tab, outside the
  // 5-step onboarding sequence (see BorrowingScenario.tsx / MainTabNavigator.tsx)
  BorrowingScenario: { standalone?: boolean } | undefined;
  FinancialRiskIntelligence: { assessment: RiskAssessment; standalone?: boolean };
  DecisionSupport: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface RootNavigatorProps {
  // Decided once by App.tsx after restoreSession() resolves — "Login" if no
  // valid session, "MainTabs" if a session exists and
  // onboardingCompletedAt is already set, "FinancialSurvivalCheck" if
  // logged in but that step was never finished.
  initialRouteName: keyof RootStackParamList;
}

export function RootNavigator({ initialRouteName }: RootNavigatorProps) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Register" component={Register} />
      <Stack.Screen
        name="FinancialSurvivalCheck"
        component={FinancialSurvivalCheck}
      />
      <Stack.Screen name="BorrowingScenario" component={BorrowingScenario} />
      <Stack.Screen
        name="FinancialRiskIntelligence"
        component={FinancialRiskIntelligence}
      />
      <Stack.Screen name="DecisionSupport" component={DecisionSupport} />
      <Stack.Screen name="MainTabs" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
