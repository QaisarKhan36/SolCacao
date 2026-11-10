import React, { createContext, useCallback, useContext, useReducer, useEffect, useState } from 'react';

const CartContext = createContext();

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingIndex = state.items.findIndex(item => item.id === action.payload.id);
      if (existingIndex > -1) {
        const updated = [...state.items];
        updated[existingIndex].quantity += 1;
        return { ...state, items: updated };
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case 'UPDATE_QUANTITY': {
      const updated = state.items
        .map(item => item.id === action.payload.id ? { ...item, quantity: action.payload.quantity } : item)
        .filter(item => item.quantity > 0);
      return { ...state, items: updated };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'REPLACE_CART':
      return { ...state, items: action.payload };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, () => {
    const local = localStorage.getItem('solcacao_cart');
    return local ? { items: JSON.parse(local) } : { items: [] };
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const addToCart = useCallback(product => dispatch({ type: 'ADD_ITEM', payload: product }), []);
  const updateQuantity = useCallback((id, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } }), []);
  const removeFromCart = useCallback(id => dispatch({ type: 'REMOVE_ITEM', payload: id }), []);
  const replaceCart = useCallback(items => dispatch({ type: 'REPLACE_CART', payload: items }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);

  useEffect(() => {
    localStorage.setItem('solcacao_cart', JSON.stringify(state.items));
  }, [state.items]);

  const totalCount = state.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cart: state.items,
      totalCount,
      subtotal,
      isDrawerOpen,
      setIsDrawerOpen,
      addToCart,
      updateQuantity,
      removeFromCart,
      replaceCart,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);