// src/components/__tests__/ProductCard.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductCard } from '../ProductCard';
import { ProductWithDetails } from '../../db/products';

const baseProduct: ProductWithDetails = {
  id: 1,
  name: 'Shampoo',
  category_id: null,
  category_name: null,
  photo_uri: null,
  package_amount: null,
  package_unit_id: null,
  package_unit_name: null,
  base_price: null,
  active_instance_count: 0,
};

describe('ProductCard', () => {
  it('calls onPress when tapped in normal mode', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <ProductCard product={baseProduct} onPress={onPress} onLongPress={() => {}} selectionMode={false} selected={false} />
    );
    fireEvent.press(getByText('Shampoo'));
    expect(onPress).toHaveBeenCalled();
  });

  it('does not show selection overlay when selectionMode is false', () => {
    const { queryByTestId } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={() => {}} selectionMode={false} selected={false} />
    );
    expect(queryByTestId('selection-overlay')).toBeNull();
  });

  it('shows unselected circle when selectionMode is true and selected is false', () => {
    const { getByTestId, queryByTestId } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={() => {}} selectionMode={true} selected={false} />
    );
    expect(getByTestId('selection-overlay')).toBeTruthy();
    expect(queryByTestId('selection-check')).toBeFalsy();
  });

  it('shows checkmark when selectionMode is true and selected is true', () => {
    const { getByTestId } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={() => {}} selectionMode={true} selected={true} />
    );
    expect(getByTestId('selection-check')).toBeTruthy();
  });

  it('calls onLongPress when long pressed', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <ProductCard product={baseProduct} onPress={() => {}} onLongPress={onLongPress} selectionMode={false} selected={false} />
    );
    fireEvent(getByText('Shampoo'), 'longPress');
    expect(onLongPress).toHaveBeenCalled();
  });
});
