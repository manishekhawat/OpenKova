import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../data/store';
import type { PaymentKind } from '../data/types';
import { colors } from '../theme';

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
import LoginScreen from '../screens/LoginScreen';
import PayScreen from '../screens/PayScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';

export type TabParamList = {
  Home: undefined;
  Cards: undefined;
  Bills: undefined;
  Garage: undefined;
  Money: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Tabs: undefined;
  CardDetail: { id: string };
  AddCard: undefined;
  AddBill: undefined;
  AddVehicle: undefined;
  AddAccount: undefined;
  VehicleDetail: { id: string };
  Pay: { kind: PaymentKind; refId: string; subId?: string };
  Insights: { cardId?: string } | undefined;
  Profile: undefined;
  Activity: undefined;
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

export default function RootNavigator() {
  const { state, ready } = useStore();

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
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
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="CardDetail" component={CardDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: '' }} />
            <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: 'Spend insights' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
            <Stack.Screen name="Activity" component={ActivityScreen} options={{ title: 'Payment history' }} />
            <Stack.Group screenOptions={{ presentation: 'modal' }}>
              <Stack.Screen name="Pay" component={PayScreen} options={{ title: 'Pay' }} />
              <Stack.Screen name="AddCard" component={AddCardScreen} options={{ title: 'Add a credit card' }} />
              <Stack.Screen name="AddBill" component={AddBillScreen} options={{ title: 'Add a biller' }} />
              <Stack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Add a vehicle' }} />
              <Stack.Screen name="AddAccount" component={AddAccountScreen} options={{ title: 'Link a bank account' }} />
            </Stack.Group>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
