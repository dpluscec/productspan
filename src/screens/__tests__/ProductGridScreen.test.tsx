// src/screens/__tests__/ProductGridScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductGridScreen } from '../ProductGridScreen';

// Mock dependencies
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({}),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb: () => void) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useEffect } = require('react');
    useEffect(() => { cb(); }, []);
  },
}));

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockAddListener = jest.fn((event, callback) => {
  return jest.fn(); // Return unsubscribe function
});
const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
  addListener: mockAddListener,
};

const mockProducts = [
  { id: 1, name: 'Shampoo', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 0 },
  { id: 2, name: 'Soap', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 0 },
];

jest.mock('../../db/products', () => ({
  getProducts: jest.fn().mockResolvedValue(mockProducts),
  deleteProduct: jest.fn().mockResolvedValue(undefined),
}));

import { getProducts, deleteProduct } from '../../db/products';

describe('ProductGridScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProducts as jest.Mock).mockResolvedValue(mockProducts);
    (deleteProduct as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders product cards', async () => {
    const { getByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    expect(getByText('Soap')).toBeTruthy();
  });

  it('enters selection mode on long press and selects the card', async () => {
    const { getByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    fireEvent(getByText('Shampoo'), 'longPress');
    // setOptions should be called with "1 selected" title
    expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({
      title: '1 selected',
    }));
  });

  it('deletes selected products on confirmation', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const confirm = buttons?.find((b: any) => b.style !== 'cancel');
      confirm?.onPress?.();
    });

    const { getByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    fireEvent(getByText('Shampoo'), 'longPress');

    // Trigger delete via the header button captured in setOptions
    const lastCall = mockSetOptions.mock.calls[mockSetOptions.mock.calls.length - 1][0];
    lastCall.headerRight?.().props.onPress();

    await waitFor(() => expect(deleteProduct).toHaveBeenCalledWith({}, 1));
    expect(getProducts).toHaveBeenCalledTimes(2); // initial load + reload after delete
  });
});
