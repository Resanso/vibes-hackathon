import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Onboarding } from "../screens/Onboarding";
import { FinancialSurvivalCheck } from "../screens/FinancialSurvivalCheck";
import { BorrowingScenario } from "../screens/BorrowingScenario";
import { FinancialRiskIntelligence } from "../screens/FinancialRiskIntelligence";
import { DecisionSupport } from "../screens/DecisionSupport";
import { MainTabNavigator } from "./MainTabNavigator";
import type { RiskAssessment } from "../api/client";

export type RootStackParamList = {
  Onboarding: undefined;
  FinancialSurvivalCheck: undefined;
  // standalone: true when reused from the "Cek Baru" tab, outside the
  // 5-step onboarding sequence (see BorrowingScenario.tsx / MainTabNavigator.tsx)
  BorrowingScenario: { standalone?: boolean } | undefined;
  FinancialRiskIntelligence: { assessment: RiskAssessment; standalone?: boolean };
  DecisionSupport: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Onboarding"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={Onboarding} />
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
