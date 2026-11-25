import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { LockGate } from '../components/LockGate';
import { Button } from '../components/ui';
import { useStore } from '../data/store';
import type { PaymentKind } from '../data/types';
import { rescheduleReminders } from '../services/reminders';
import { colors, space, type } from '../theme';

import AccountsScreen from '../screens/AccountsScreen';
import ActivityScreen from '../screens/ActivityScreen';
import AddAccountScreen from '../screens/AddAccountScreen';
import AddBillScreen from '../screens/AddBillScreen';
import AddCardScreen from '../screens/AddCardScreen';
import AddVehicleScreen from '../screens/AddVehicleScreen';
import BillsScreen from '../screens/BillsScreen';
import CardDetailScreen from '../screens/CardDetailScreen';
import CardsScreen from '../screens/CardsScreen';
import GarageScreen from '../screens/GarageScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import PayScreen from '../screens/PayScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SmsImportScreen from '../screens/SmsImportScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';

export type TabParamList = {
  Home: undefined;
  Cards: undefined;
  Bills: undefined;
  Garage: undefined;
  Money: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Tabs: undefined;
  CardDetail: { id: string };
  AddCard: { id?: string } | undefined;
  AddBill: { id?: string } | undefined;
  AddVehicle: { id?: string } | undefined;
  AddAccount: { id?: string } | undefined;
  VehicleDetail: { id: string };
  Pay: { kind: PaymentKind; refId: string; subId?: string };
  Insights: { cardId?: string } | undefined;
  Settings: undefined;
  Activity: undefined;
  SmsImport: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, [React.ComponentProps<typeof Ionicons>['name'], React.ComponentProps<typeof Ionicons>['name']]> = {
  Home: ['home', 'home-outline'],
  Cards: ['card', 'card-outline'],
  Bills: ['receipt', 'receipt-outline'],
  Garage: ['car-sport', 'car-sport-outline'],
  Money: ['wallet', 'wallet-outline'],
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.line },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={TAB_ICONS[route.name][focused ? 0 : 1]} size={size - 2} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Cards" component={CardsScreen} />
      <Tab.Screen name="Bills" component={BillsScreen} />
      <Tab.Screen name="Garage" component={GarageScreen} />
      <Tab.Screen name="Money" component={AccountsScreen} />
    </Tab.Navigator>
  );
}

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, text: colors.ink, border: colors.line, primary: colors.accent },
};

/** Keeps the phone's scheduled reminders in step with Kova's data. */
function ReminderSync() {
  const { state } = useStore();
  const { user, cards, bills, vehicles, settings } = state;
  useEffect(() => {
    const t = setTimeout(() => {
      rescheduleReminders(state).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, cards, bills, vehicles, settings]);
  return null;
}

function LoadError({ message }: { message: string }) {
  const { dispatch } = useStore();
  const [sure, setSure] = React.useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: space(8) }}>
      <Text style={type.title}>Couldn't open your data</Text>
      <Text style={[type.small, { marginTop: space(3), fontSize: 15, lineHeight: 22 }]}>
        Kova couldn't decrypt the data on this phone ({message}). This can happen if the phone's secure keystore was reset.
        You can start again and restore from a backup in Settings.
      </Text>
      <Button label={sure ? 'Tap again to erase and start over' : 'Start over'} variant="danger" onPress={() => (sure ? dispatch({ type: 'erase' }) : setSure(true))} style={{ marginTop: space(8) }} />
    </View>
  );
}

export default function RootNavigator() {
  const { state, ready, loadError } = useStore();

  if (loadError) return <LoadError message={loadError} />;

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <LockGate>
    <ReminderSync />
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!state.user ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: 'Spend insights' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
            <Stack.Screen name="SmsImport" component={SmsImportScreen} options={{ title: '' }} />
            <Stack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Payment history' }} />
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="Pay" component={PayScreen} options={{ title: 'Pay' }} />
              <Stack.Screen name="AddCard" component={AddCardScreen} options={{ title: 'Add a credit card' }} />
              <Stack.Screen name="AddBill" component={AddBillScreen} options={{ title: 'Add a biller' }} />
              <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Add a vehicle' }} />
              <Stack.Screen name="AddAccount" component={AddAccountScreen} options={{ title: 'Add a bank account' }} />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </LockGate>
  );
}
