import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { Onboarding } from "../screens/Onboarding";
import { FinancialSurvivalCheck } from "../screens/FinancialSurvivalCheck";

export type RootStackParamList = {
  Onboarding: undefined;
  FinancialSurvivalCheck: undefined;
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
    </Stack.Navigator>
  );
}
