import React, { useEffect, useState } from 'react';
import { Menu, Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCart } from '../context/CartContext';

const NAV_LINKS = [
  { screen: 'catalog', translationKey: 'navCatalog' },
  { screen: 'b2b', translationKey: 'navB2B' },
  { screen: 'contact', translationKey: 'navContact' },
];

export const Navbar = ({ currentScreen, setCurrentScreen, isAuthenticated, account, onSignOut, onSearch }) => {
  const { lang, toggleLanguage, t } = useLanguage();
  const { totalCount, setIsDrawerOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hideCartButton = currentScreen === 'auth' || currentScreen === 'checkout';
  const authActionKey = isAuthenticated ? 'navSignOut' : 'navSignIn';

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = event => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navigate = screen => {
    setCurrentScreen(screen);
    setMobileMenuOpen(false);
  };

  const handleAuthAction = () => {
    setMobileMenuOpen(false);
    if (isAuthenticated) onSignOut();
    else setCurrentScreen('auth');
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-[#43281c] bg-[#2b1810] px-4 py-3 text-amber-50 shadow sm:px-8 sm:py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
        
        {/* Brand Logo */}
        <div className="flex min-w-0 items-center gap-4 sm:gap-8">
          <button 
            onClick={() => navigate('home')} 
            className="shrink-0 font-serif text-xl font-black tracking-wider text-amber-400 transition hover:text-amber-300 sm:text-2xl"
          >
            SolCacao
          </button>
          
          {/* Desktop Navigation Links */}
          <div className="hidden items-center gap-6 text-sm font-medium md:flex">
            {NAV_LINKS.map(link => (
              <button
                key={link.screen}
                onClick={() => navigate(link.screen)}
                aria-current={currentScreen === link.screen ? 'page' : undefined}
                className={`transition ${currentScreen === link.screen ? 'font-bold text-amber-400' : 'hover:text-amber-400'}`}
              >
                {t(link.translationKey)}
              </button>
            ))}
            {isAuthenticated && (
              <button
                onClick={() => navigate('profile')}
                aria-current={currentScreen === 'profile' ? 'page' : undefined}
                className={`transition ${currentScreen === 'profile' ? 'font-bold text-amber-400' : 'hover:text-amber-400'}`}
              >
                {t('navProfile')}
              </button>
            )}
            <button
              type="button"
              onClick={onSearch}
              aria-label={t('navSearch')}
              title={t('navSearch')}
              className="grid size-9 place-items-center rounded hover:bg-white/10"
            >
              <Search size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold sm:gap-4">
          {/* Language Toggle */}
          <div className="flex items-center border border-[#8c533c] rounded bg-[#43281c] p-0.5">
            <button
              onClick={() => toggleLanguage('en')}
              aria-label={t('switchToEnglish')}
              className={`px-2 py-0.5 rounded transition ${lang === 'en' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-100 hover:text-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => toggleLanguage('es')}
              aria-label={t('switchToSpanish')}
              className={`px-2 py-0.5 rounded transition ${lang === 'es' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-100 hover:text-white'}`}
            >
              ES
            </button>
          </div>

          <button
            onClick={handleAuthAction}
            className="hidden text-amber-200 transition hover:text-white md:inline-flex"
          >
            {t(authActionKey)}
          </button>

          {/* Dynamic Cart Badge Drawer Trigger */}
          {!hideCartButton && (
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1 rounded bg-amber-600 px-2 py-1.5 text-white shadow transition hover:bg-amber-500 sm:gap-2 sm:px-3"
            >
              <span>🛒 {t('cartButton')}</span>
              <span className="bg-[#2b1810] text-amber-300 px-1.5 py-0.2 rounded-full font-bold">
                {totalCount}
              </span>
            </button>
          )}

          <button
            type="button"
            className="grid size-10 shrink-0 place-items-center rounded text-amber-100 hover:bg-white/10 md:hidden"
            aria-label={t(mobileMenuOpen ? 'closeMenu' : 'openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen(open => !open)}
          >
            {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 md:hidden ${mobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileMenuOpen}
      >
          <button
            type="button"
            aria-label={t('closeMenu')}
            tabIndex={mobileMenuOpen ? 0 : -1}
            className={`absolute inset-0 h-full w-full bg-black/60 transition-opacity duration-300 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside
            id="mobile-navigation"
            role="dialog"
            aria-modal={mobileMenuOpen ? 'true' : undefined}
            aria-label={t('mobileNavigation')}
            inert={!mobileMenuOpen}
            className={`absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col border-l border-[#6f3d2a] bg-[#2b1810] p-5 text-amber-50 shadow-2xl transition-transform duration-300 ease-out ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="mb-8 flex items-center justify-between border-b border-[#6f3d2a] pb-4">
              <div>
                <span className="font-serif text-xl font-black text-amber-400">SolCacao</span>
                {isAuthenticated && account && (
                  <p className="mt-1 max-w-64 truncate text-xs text-amber-100/80">
                    {t('accountSignedIn', { name: account.name || account.email })}
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={t('closeMenu')}
                onClick={() => setMobileMenuOpen(false)}
                className="grid size-10 place-items-center rounded hover:bg-white/10"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSearch();
                }}
                className="flex items-center gap-3 rounded px-3 py-3 text-left text-base transition hover:bg-white/10"
              >
                <Search size={18} aria-hidden="true" />
                {t('navSearch')}
              </button>
              {NAV_LINKS.map(link => (
                <button
                  key={link.screen}
                  onClick={() => navigate(link.screen)}
                  aria-current={currentScreen === link.screen ? 'page' : undefined}
                  className={`rounded px-3 py-3 text-left text-base transition ${currentScreen === link.screen ? 'bg-amber-500/15 font-bold text-amber-300' : 'hover:bg-white/10'}`}
                >
                  {t(link.translationKey)}
                </button>
              ))}
              {isAuthenticated && (
                <button
                  onClick={() => navigate('profile')}
                  aria-current={currentScreen === 'profile' ? 'page' : undefined}
                  className={`rounded px-3 py-3 text-left text-base transition ${currentScreen === 'profile' ? 'bg-amber-500/15 font-bold text-amber-300' : 'hover:bg-white/10'}`}
                >
                  {t('navProfile')}
                </button>
              )}
              <button onClick={handleAuthAction} className="mt-3 rounded border border-amber-300/50 px-3 py-3 text-left text-base font-bold text-amber-200 hover:bg-white/10">
                {t(authActionKey)}
              </button>
            </div>
          </aside>
      </div>
    </nav>
  );
};