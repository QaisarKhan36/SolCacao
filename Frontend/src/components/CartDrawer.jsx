import React from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedProductText } from '../utils/products';

export const CartDrawer = ({ setCurrentScreen }) => {
  const { cart, subtotal, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeFromCart } = useCart();
  const { lang, t } = useLanguage();

  if (!isDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end transition-opacity">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl flex flex-col justify-between border-l border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-[#2b1810]">{t('cartTitle')}</h2>
            <span className="text-xs text-slate-500">{t('guestSession')}</span>
          </div>
          <button onClick={() => setIsDrawerOpen(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold">
            ✕
          </button>
        </div>

        {/* Item List */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">{t('cartEmpty')}</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-sm text-[#2b1810]">
                    {getLocalizedProductText(item.name, lang) || item.sku || item.id}
                  </h4>
                  <span className="text-xs text-slate-500">${item.price.toFixed(2)} {t('each')}</span>
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-5 h-5 bg-slate-100 rounded text-xs font-bold hover:bg-slate-200"
                    >-</button>
                    <span className="text-xs font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-5 h-5 bg-slate-100 rounded text-xs font-bold hover:bg-slate-200"
                    >+</button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="block text-[10px] text-red-500 hover:underline mt-1"
                  >
                    {t('remove')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 space-y-4">
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span className="font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('taxShipping')}</span>
              <span>{t('calculatedAtCheckout')}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#2b1810] pt-2 border-t border-slate-200">
              <span>{t('total')}</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </div>
          <button 
            disabled={cart.length === 0}
            onClick={() => {
              setIsDrawerOpen(false);
              setCurrentScreen('checkout');
            }}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white font-bold rounded text-xs tracking-wider uppercase shadow transition"
          >
            {t('checkout')} &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};