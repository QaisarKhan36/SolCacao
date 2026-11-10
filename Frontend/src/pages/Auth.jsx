import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { loginAccount, registerAccount, USE_DEMO_AUTH } from '../services/authApi';

export const Auth = ({ onSignIn }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [accountType, setAccountType] = useState('retail');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    if (mode === 'register' && password !== confirmPassword) {
      setErrorMessage('authPasswordMismatch');
      return;
    }

    setIsSubmitting(true);
    try {
      const session = mode === 'register'
        ? await registerAccount({
          name: name.trim(),
          email: email.trim(),
          password,
          accountType,
          ...(accountType === 'b2b' ? { companyName: companyName.trim(), taxId: taxId.trim() } : {}),
        })
        : await loginAccount({ email: email.trim(), password });

      await onSignIn(session);
    } catch (error) {
      setErrorMessage(error.code === 'invalid_credentials'
        ? 'authInvalidCredentials'
        : error.code === 'account_exists'
          ? 'authAccountExists'
          : error.code === 'missing_access_token'
            ? 'authMissingToken'
            : 'authRequestFailed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectMode = nextMode => {
    setMode(nextMode);
    setErrorMessage('');
  };

  return (
    <div className="max-w-md mx-auto py-16 px-6">
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-[#2b1810] to-[#43281c] text-white p-6 text-center">
          <h1 className="font-serif text-2xl font-black text-amber-400">{t(mode === 'login' ? 'authLoginTitle' : 'authRegisterTitle')}</h1>
          <p className="text-xs text-amber-100 mt-1">{t(mode === 'login' ? 'authLoginDescription' : 'authRegisterDescription')}</p>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 p-2" role="tablist" aria-label={t('authModes')}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => selectMode('login')}
            className={`flex-1 rounded px-3 py-2 text-sm font-bold ${mode === 'login' ? 'bg-white text-[#2b1810] shadow-sm' : 'text-slate-500'}`}
          >
            {t('authLoginTab')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            onClick={() => selectMode('register')}
            className={`flex-1 rounded px-3 py-2 text-sm font-bold ${mode === 'register' ? 'bg-white text-[#2b1810] shadow-sm' : 'text-slate-500'}`}
          >
            {t('authRegisterTab')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {USE_DEMO_AUTH && <p className="rounded border border-amber-200 bg-amber-50 p-2 text-amber-900">{t('demoAuthNotice')}</p>}

          {mode === 'register' && (
            <>
              <div>
                <label className="block font-bold text-slate-600 mb-1" htmlFor="auth-name">{t('fullName')}</label>
                <input id="auth-name" type="text" required autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="w-full border border-slate-300 rounded p-2.5" />
              </div>

              <fieldset>
                <legend className="mb-2 block font-bold text-slate-600">{t('accountType')}</legend>
                <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
                  <button type="button" onClick={() => setAccountType('retail')} aria-pressed={accountType === 'retail'} className={`flex-1 py-2 rounded-md transition ${accountType === 'retail' ? 'bg-white text-[#2b1810] shadow-sm font-bold' : 'text-slate-500'}`}>
                    {t('roleRetail')}
                  </button>
                  <button type="button" onClick={() => setAccountType('b2b')} aria-pressed={accountType === 'b2b'} className={`flex-1 py-2 rounded-md transition ${accountType === 'b2b' ? 'bg-white text-amber-900 shadow-sm font-bold' : 'text-slate-500'}`}>
                    {t('roleB2B')}
                  </button>
                </div>
              </fieldset>

              {accountType === 'b2b' && (
                <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                  <div>
                    <label className="block font-bold text-amber-900 mb-1" htmlFor="auth-company">{t('companyName')}</label>
                    <input id="auth-company" type="text" required value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder={t('companyPlaceholder')} className="w-full border border-amber-300 rounded p-2 bg-white" />
                  </div>
                  <div>
                    <label className="block font-bold text-amber-900 mb-1" htmlFor="auth-tax-id">{t('taxId')}</label>
                    <input id="auth-tax-id" type="text" required value={taxId} onChange={event => setTaxId(event.target.value)} placeholder="XX-XXXXXXX" className="w-full border border-amber-300 rounded p-2 bg-white" />
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block font-bold text-slate-600 mb-1" htmlFor="auth-email">{t('emailAddress')}</label>
            <input id="auth-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={t('emailPlaceholder')} className="w-full border border-slate-300 rounded p-2.5" />
          </div>

          <div>
            <label className="block font-bold text-slate-600 mb-1" htmlFor="auth-password">{t('password')}</label>
            <input id="auth-password" type="password" required minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} className="w-full border border-slate-300 rounded p-2.5" />
          </div>

          {mode === 'register' && (
            <div>
              <label className="block font-bold text-slate-600 mb-1" htmlFor="auth-confirm-password">{t('confirmPassword')}</label>
              <input id="auth-confirm-password" type="password" required minLength={8} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="w-full border border-slate-300 rounded p-2.5" />
            </div>
          )}

          {errorMessage && <p className="text-red-700" role="alert">{t(errorMessage)}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white font-bold rounded text-xs uppercase tracking-wider shadow transition mt-2">
            {t(isSubmitting ? 'authSubmitting' : mode === 'register' ? 'authRegisterSubmit' : 'authLoginSubmit')}
          </button>
        </form>
      </div>
    </div>
  );
};
