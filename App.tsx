import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/db/schema';
import { AppProvider } from './src/context/AppContext';
import { AppSettingsProvider } from './src/context/AppSettingsContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="productspan.db" onInit={initDatabase}>
        <AppProvider>
          <AppSettingsProvider>
            <AppNavigator />
          </AppSettingsProvider>
        </AppProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
