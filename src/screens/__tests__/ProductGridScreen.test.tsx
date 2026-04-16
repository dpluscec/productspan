// src/screens/__tests__/ProductGridScreen.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ProductGridScreen } from '../ProductGridScreen';

// Mock dependencies
jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => ({
    withTransactionAsync: async (fn: () => Promise<void>) => fn(),
  }),
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
const mockAddListener = jest.fn((_event: any, _callback: any) => {
  return jest.fn(); // Return unsubscribe function
});
const mockNavigation = {
  navigate: mockNavigate,
  setOptions: mockSetOptions,
  addListener: mockAddListener,
};

const mockProducts = [
  { id: 1, name: 'Shampoo', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 1 },
  { id: 2, name: 'Soap', category_id: null, category_name: null, photo_uri: null, package_amount: null, package_unit_id: null, package_unit_name: null, base_price: null, active_instance_count: 0 },
];

jest.mock('../../db/products', () => ({
  getProducts: jest.fn(),
  deleteProduct: jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({
  useAppContext: jest.fn(() => ({
    productFilterCategoryIds: [],
    setProductFilterCategoryIds: jest.fn(),
    productFilterActiveKeys: [],
    setProductFilterActiveKeys: jest.fn(),
  })),
}));

import { getProducts, deleteProduct } from '../../db/products';
import { useAppContext } from '../../context/AppContext';

describe('ProductGridScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getProducts as jest.Mock).mockResolvedValue(mockProducts);
    (deleteProduct as jest.Mock).mockResolvedValue(undefined);
    (useAppContext as jest.Mock).mockReturnValue({
      productFilterCategoryIds: [],
      setProductFilterCategoryIds: jest.fn(),
      productFilterActiveKeys: [],
      setProductFilterActiveKeys: jest.fn(),
    });
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
    await waitFor(() => expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({
      title: '1 selected',
    })));
  });

  it('deletes selected products on confirmation', async () => {
    let alertButtons: any[] = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title: any, _msg: any, buttons: any) => {
      alertButtons = buttons || [];
    });

    const { getByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    fireEvent(getByText('Shampoo'), 'longPress');

    // Wait for selection mode to be reflected in header before pressing trash
    await waitFor(() => expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({
      title: '1 selected',
    })));

    // Trigger handleDelete via the header button — this populates alertButtons
    // Find the setOptions call that has the trash button (title '1 selected')
    const selectionCall = mockSetOptions.mock.calls
      .map((c: any[]) => c[0])
      .find((o: any) => o.title === '1 selected');
    await act(async () => { selectionCall.headerRight?.()?.props?.onPress?.(); });

    // Verify Alert.alert was called exactly once with the right selection count
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    expect(Alert.alert).toHaveBeenCalledWith('Delete 1 product?', expect.any(String), expect.any(Array));
    expect(alertButtons).toHaveLength(2);
    const confirm = alertButtons.find((b: any) => b.style !== 'cancel');
    expect(confirm).toBeDefined();
    expect(confirm.onPress).toBeDefined();

    // onPress calls deleteProduct synchronously (inside map before await Promise.all)
    confirm.onPress();
    expect(deleteProduct).toHaveBeenCalledWith(expect.any(Object), 1);
    await waitFor(() => expect(getProducts).toHaveBeenCalledTimes(2)); // initial load + reload after delete
  });

  it('shows only active products when productFilterActiveKeys is ["active"]', async () => {
    (useAppContext as jest.Mock).mockReturnValue({
      productFilterCategoryIds: [],
      setProductFilterCategoryIds: jest.fn(),
      productFilterActiveKeys: ['active'],
      setProductFilterActiveKeys: jest.fn(),
    });

    const { getByText, queryByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Shampoo')).toBeTruthy());
    expect(queryByText('Soap')).toBeNull();
  });

  it('shows only inactive products when productFilterActiveKeys is ["inactive"]', async () => {
    (useAppContext as jest.Mock).mockReturnValue({
      productFilterCategoryIds: [],
      setProductFilterCategoryIds: jest.fn(),
      productFilterActiveKeys: ['inactive'],
      setProductFilterActiveKeys: jest.fn(),
    });

    const { getByText, queryByText } = render(
      <ProductGridScreen navigation={mockNavigation as any} route={{} as any} />
    );
    await waitFor(() => expect(getByText('Soap')).toBeTruthy());
    expect(queryByText('Shampoo')).toBeNull();
  });
});
