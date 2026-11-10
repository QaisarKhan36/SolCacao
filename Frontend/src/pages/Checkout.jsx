import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { getLocalizedProductText } from '../utils/products';

export const Checkout = ({ setCurrentScreen }) => {
  const { lang, t } = useLanguage();
  const { cart, subtotal, clearCart } = useCart();
  const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '' });

  const salesTax = subtotal * 0.085;
  const grandTotal = subtotal + salesTax;

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    alert(t('orderAuthorized'));
    clearCart();
    setCurrentScreen('catalog');
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-black text-[#2b1810]">{t('checkoutTitle')}</h1>
        <p className="text-xs text-slate-500 mt-1">{t('checkoutDescription')}</p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Address Forms */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-[#2b1810]">{t('shippingDestination')}</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">{t('streetAddress')}</label>
                <input 
                  type="text" 
                  required 
                  value={address.street} 
                  onChange={e => setAddress({ ...address, street: e.target.value })}
                  placeholder={t('streetPlaceholder')}
                  className="w-full border border-slate-300 rounded p-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">{t('city')}</label>
                  <input 
                    type="text" 
                    required 
                    value={address.city} 
                    onChange={e => setAddress({ ...address, city: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">{t('state')}</label>
                  <input 
                    type="text" 
                    required 
                    value={address.state} 
                    onChange={e => setAddress({ ...address, state: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">{t('postalCode')}</label>
                  <input 
                    type="text" 
                    required 
                    value={address.zip} 
                    onChange={e => setAddress({ ...address, zip: e.target.value })}
                    className="w-full border border-slate-300 rounded p-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-5 bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
          <h3 className="font-bold text-sm text-[#2b1810] pb-3 border-b border-slate-200">
            {t(cart.length === 1 ? 'orderSummarySingular' : 'orderSummary', { count: cart.length })}
          </h3>
          
          <div className="space-y-3 text-xs">
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center">
                <span>{getLocalizedProductText(item.name, lang) || item.sku || item.id} (x{item.quantity})</span>
                <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span className="font-bold">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('coldChainShipping')}</span>
              <span className="font-bold text-emerald-700">{t('free')}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('estimatedSalesTax')}</span>
              <span>${salesTax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-[#2b1810] pt-3 border-t border-slate-200">
              <span>{t('totalAmount')}</span>
              <span className="text-amber-700">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={cart.length === 0}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-300 text-white font-bold rounded text-xs uppercase tracking-wider shadow transition"
          >
            {t('placeOrderPay', { amount: grandTotal.toFixed(2) })}
          </button>
        </div>

      </form>
    </div>
  );
};