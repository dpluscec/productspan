import React from 'react';
import { SQLiteProvider } from 'expo-sqlite';
import { initDatabase } from './src/db/schema';
import { AppProvider } from './src/context/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SQLiteProvider databaseName="productspan.db" onInit={initDatabase}>
      <AppProvider>
        <AppNavigator />
      </AppProvider>
    </SQLiteProvider>
  );
}
