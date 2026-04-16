import React from 'react';
import { View, Text } from 'react-native';
import { ProductDetailScreenProps } from '../navigation/types';
export function ProductDetailScreen({ route }: ProductDetailScreenProps) {
  return <View><Text>Product Detail {route.params.productId}</Text></View>;
}
