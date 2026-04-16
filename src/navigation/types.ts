import { NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type HomeStackParamList = {
  ProductGrid: undefined;
  AddEditProduct: { productId?: number };
  ProductDetail: { productId: number };
  ProductFilter: undefined;
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList>;
  Settings: undefined;
};

export type ProductGridScreenProps = NativeStackScreenProps<HomeStackParamList, 'ProductGrid'>;
export type AddEditProductScreenProps = NativeStackScreenProps<HomeStackParamList, 'AddEditProduct'>;
export type ProductDetailScreenProps = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>;
export type ProductFilterScreenProps = NativeStackScreenProps<HomeStackParamList, 'ProductFilter'>;
export type SettingsScreenProps = BottomTabScreenProps<RootTabParamList, 'Settings'>;
