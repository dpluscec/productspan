import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ProductListRow } from '../ProductListRow';

const mockProduct = {
  id: 1,
  name: 'Shampoo',
  category_id: 1,
  category_name: 'Hair',
  photo_uri: null,
  package_amount: null,
  package_unit_id: null,
  package_unit_name: null,
  base_price: null,
  active_instance_count: 2,
};

const noCategory = { ...mockProduct, category_id: null, category_name: null };

describe('ProductListRow', () => {
  it('renders product name', () => {
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('Shampoo')).toBeTruthy();
  });

  it('renders category name when present', () => {
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('Hair')).toBeTruthy();
  });

  it('does not render category when null', () => {
    const { queryByText } = render(<ProductListRow product={noCategory} onPress={jest.fn()} />);
    expect(queryByText('Hair')).toBeNull();
  });

  it('shows active count when > 0', () => {
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={jest.fn()} />);
    expect(getByText('2 active')).toBeTruthy();
  });

  it('hides active count when 0', () => {
    const { queryByText } = render(<ProductListRow product={{ ...mockProduct, active_instance_count: 0 }} onPress={jest.fn()} />);
    expect(queryByText(/active/)).toBeNull();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<ProductListRow product={mockProduct} onPress={onPress} />);
    fireEvent.press(getByText('Shampoo'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows checkmark when selected in selection mode', () => {
    const { getByTestId } = render(
      <ProductListRow product={mockProduct} onPress={jest.fn()} selectionMode selected />
    );
    expect(getByTestId('list-selection-check')).toBeTruthy();
  });

  it('shows circle but no checkmark when not selected in selection mode', () => {
    const { queryByTestId } = render(
      <ProductListRow product={mockProduct} onPress={jest.fn()} selectionMode={true} selected={false} />
    );
    expect(queryByTestId('list-selection-check')).toBeNull();
  });
});
