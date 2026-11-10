import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { updateCurrentAccount, USE_DEMO_AUTH } from '../services/authApi';

export const Profile = ({ account, onAccountUpdated }) => {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: account?.name ?? '',
    email: account?.email ?? '',
    companyName: account?.companyName ?? '',
    taxId: account?.taxId ?? '',
  });
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isB2B = String(account?.accountType ?? '').toLowerCase() === 'b2b';

  const updateField = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
    setStatus('');
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setIsSaving(true);
    setStatus('');
    const updates = {
      name: form.name.trim(),
      email: form.email.trim(),
      ...(isB2B ? { companyName: form.companyName.trim(), taxId: form.taxId.trim() } : {}),
    };

    try {
      const updatedAccount = await updateCurrentAccount(updates);
      onAccountUpdated(updatedAccount);
      setForm(current => ({ ...current, ...updates }));
      setStatus('profileSaved');
    } catch (error) {
      setStatus(error.code === 'missing_access_token' ? 'profileAuthRequired' : 'profileSaveFailed');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-black text-[#2b1810]">{t('profileTitle')}</h1>
        <p className="mt-1 text-sm text-slate-600">{t('profileDescription')}</p>
      </div>
      {USE_DEMO_AUTH && (
        <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
          {t('demoProfileNotice')}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="profile-name" className="mb-1 block text-sm font-semibold text-slate-700">{t('fullName')}</label>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            required
            value={form.name}
            onChange={event => updateField('name', event.target.value)}
            className="w-full rounded border border-slate-300 p-2.5"
          />
        </div>
        <div>
          <label htmlFor="profile-email" className="mb-1 block text-sm font-semibold text-slate-700">{t('emailAddress')}</label>
          <input
            id="profile-email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={event => updateField('email', event.target.value)}
            className="w-full rounded border border-slate-300 p-2.5"
          />
        </div>
        {isB2B && (
          <>
            <div>
              <label htmlFor="profile-company" className="mb-1 block text-sm font-semibold text-slate-700">{t('companyName')}</label>
              <input
                id="profile-company"
                type="text"
                value={form.companyName}
                onChange={event => updateField('companyName', event.target.value)}
                className="w-full rounded border border-slate-300 p-2.5"
              />
            </div>
            <div>
              <label htmlFor="profile-tax-id" className="mb-1 block text-sm font-semibold text-slate-700">{t('taxId')}</label>
              <input
                id="profile-tax-id"
                type="text"
                value={form.taxId}
                onChange={event => updateField('taxId', event.target.value)}
                className="w-full rounded border border-slate-300 p-2.5"
              />
            </div>
          </>
        )}
        {status && (
          <p className={status === 'profileSaved' ? 'text-sm text-emerald-800' : 'text-sm text-red-700'} role="status">
            {t(status)}
          </p>
        )}
        <button type="submit" disabled={isSaving} className="rounded bg-amber-600 px-5 py-2.5 font-bold text-white transition hover:bg-amber-500 disabled:opacity-60">
          {t(isSaving ? 'profileSaving' : 'profileSave')}
        </button>
      </form>
    </div>
  );
};
