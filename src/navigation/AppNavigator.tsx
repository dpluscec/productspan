import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { HomeStackParamList, RootTabParamList } from './types';
import { ProductGridScreen } from '../screens/ProductGridScreen';
import { AddEditProductScreen } from '../screens/AddEditProductScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="ProductGrid" component={ProductGridScreen} options={{ title: 'My Products' }} />
      <HomeStack.Screen
        name="AddEditProduct"
        component={AddEditProductScreen}
        options={({ route }) => ({ title: route.params.productId ? 'Edit Product' : 'Add Product' })}
      />
      <HomeStack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
    </HomeStack.Navigator>
  );
}

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Home') {
            return <Ionicons name={focused ? 'grid' : 'grid-outline'} size={size} color={color} />;
          }
          return <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />;
        },
      })}>
        <Tab.Screen name="Home" component={HomeStackNavigator} options={{ headerShown: false, title: 'Products' }} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
