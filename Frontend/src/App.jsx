import React, { useEffect, useRef, useState } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { CartProvider } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { B2BWizard } from './pages/B2BWizard';
import { Contact } from './pages/Contact';
import { Auth } from './pages/Auth';
import { Profile } from './pages/Profile';
import { Checkout } from './pages/Checkout';
import { useLanguage } from './context/LanguageContext';
import { useCart } from './context/CartContext';
import { persistCartForAccount, syncCartWithAccount } from './services/cartApi';
import { clearAccountSession, restoreAccountSession } from './services/authApi';

const SiteFooter = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#2b1810] text-amber-200/60 py-8 px-6 text-center text-xs border-t border-[#43281c] mt-16">
      <p>{t('footer')}</p>
    </footer>
  );
};

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [account, setAccount] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [catalogSearchFocusRequest, setCatalogSearchFocusRequest] = useState(0);
  const { cart, replaceCart, setIsDrawerOpen } = useCart();
  const cartRef = useRef(cart);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    let active = true;
    restoreAccountSession()
      .then(async session => {
        if (!active || !session) return;
        setAccount(session.account);
        setIsAuthenticated(true);
        try {
          const mergedCart = await syncCartWithAccount(cartRef.current);
          if (active && mergedCart) replaceCart(mergedCart);
        } catch {
          // Keep the locally persisted cart available if account sync is offline.
        }
      })
      .catch(() => {
        // Keep the public storefront usable if session restoration is offline.
      });

    return () => {
      active = false;
    };
  }, [replaceCart]);

  const handleSearch = () => {
    setCurrentScreen('catalog');
    setCatalogSearchFocusRequest(request => request + 1);
  };

  const handleSignIn = async session => {
    setAccount(session.account);
    setIsAuthenticated(true);
    setCurrentScreen('home');
    try {
      const mergedCart = await syncCartWithAccount(cart);
      if (mergedCart) replaceCart(mergedCart);
    } catch {
      // Keep the locally persisted cart available if account sync is offline.
    }
  };

  const handleSignOut = async () => {
    try {
      await persistCartForAccount(cart);
    } catch {
      // Keep the locally persisted cart available if account sync is offline.
    }
    setIsDrawerOpen(false);
    clearAccountSession();
    setAccount(null);
    setIsAuthenticated(false);
    setCurrentScreen('home');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col justify-between">
      <div>
        <Navbar
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          onSearch={handleSearch}
          isAuthenticated={isAuthenticated}
          account={account}
          onSignOut={handleSignOut}
        />
        <CartDrawer setCurrentScreen={setCurrentScreen} />

        <main>
          {currentScreen === 'auth' ? (
            <Auth onSignIn={handleSignIn} />
          ) : (
            <>
              {currentScreen === 'home' && <Home setCurrentScreen={setCurrentScreen} />}
              {currentScreen === 'catalog' && <Catalog focusSearchRequest={catalogSearchFocusRequest} />}
              {currentScreen === 'b2b' && <B2BWizard />}
              {currentScreen === 'contact' && <Contact />}
              {currentScreen === 'profile' && <Profile account={account} onAccountUpdated={setAccount} />}
              {currentScreen === 'checkout' && <Checkout setCurrentScreen={setCurrentScreen} />}
            </>
          )}
        </main>
      </div>

      <SiteFooter />
    </div>
  );
};

export default function App() {
  return (
    <LanguageProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </LanguageProvider>
  );
}