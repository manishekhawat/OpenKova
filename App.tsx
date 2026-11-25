import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from './src/data/store';
import RootNavigator from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
