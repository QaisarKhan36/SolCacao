import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { submitB2BQuote } from '../services/b2bApi';

const MAX_TECH_PACK_SIZE = 10 * 1024 * 1024;
const ALLOWED_TECH_PACK_EXTENSIONS = ['.ai', '.pdf', '.svg', '.eps'];

const validateStep = (step, formData) => {
  const errors = {};

  if (step === 1) {
    const targetPercentage = Number(formData.targetPercentage);
    if (!Number.isFinite(targetPercentage) || targetPercentage < 0 || targetPercentage > 100) {
      errors.targetPercentage = 'b2bPercentageError';
    }
    if (!formData.roast) errors.roast = 'b2bRoastError';
  }

  if (step === 3) {
    const estimatedUnits = Number(formData.estimatedUnits);
    if (!Number.isInteger(estimatedUnits) || estimatedUnits < 1) {
      errors.estimatedUnits = 'b2bVolumeError';
    }
    if (!formData.packagingTier) errors.packagingTier = 'b2bPackagingError';
  }

  if (step === 4 && formData.techPack) {
    const extension = `.${formData.techPack.name.split('.').pop().toLowerCase()}`;
    if (!ALLOWED_TECH_PACK_EXTENSIONS.includes(extension)) errors.techPack = 'b2bFileTypeError';
    else if (formData.techPack.size > MAX_TECH_PACK_SIZE) errors.techPack = 'b2bFileSizeError';
  }

  return errors;
};

export const B2BWizard = () => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [submittedQuoteId, setSubmittedQuoteId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    origin: 'Esmeraldas, Ecuador',
    targetPercentage: 75,
    roast: 'medium',
    moldRequired: true,
    packagingTier: 'Luxury Rigid Box',
    estimatedUnits: 500,
    techPack: null,
  });

  const updateFormData = (field, value) => {
    setFormData(current => ({ ...current, [field]: value }));
    setValidationErrors(current => ({ ...current, [field]: '' }));
    setSubmissionMessage('');
  };

  const handleContinue = () => {
    const errors = validateStep(step, formData);
    setValidationErrors(errors);
    if (Object.keys(errors).length === 0) setStep(current => current + 1);
  };

  const handleSubmit = async () => {
    const errors = [1, 3, 4].reduce((allErrors, currentStep) => ({
      ...allErrors,
      ...validateStep(currentStep, formData),
    }), {});
    setValidationErrors(errors);
    if (Object.keys(errors).length > 0) {
      setStep(errors.targetPercentage || errors.roast ? 1 : errors.estimatedUnits || errors.packagingTier ? 3 : 4);
      return;
    }

    setIsSubmitting(true);
    setSubmissionMessage('');
    setSubmittedQuoteId('');
    try {
      const result = await submitB2BQuote(formData);
      setSubmittedQuoteId(result.quoteId ?? result.id ?? '');
      setSubmissionMessage(result.quoteId || result.id ? 'b2bQuoteSubmittedWithId' : 'b2bQuoteSubmitted');
    } catch (error) {
      setSubmissionMessage(error.code === 'missing_access_token'
        ? 'b2bAuthRequired'
        : error.code === 'quote_unauthorized'
          ? 'b2bUnauthorized'
          : 'b2bSubmissionFailed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <div className="mb-10 text-center">
          <h1 className="text-3xl font-serif font-black text-[#2b1810]">{t('b2bTitle')}</h1>
          <p className="text-sm text-slate-600 mt-2">{t('b2bDescription')}</p>
        
        {/* Step Indicators */}
        <div className="grid grid-cols-4 gap-2 mt-8 text-xs font-semibold">
          {['b2bStep1', 'b2bStep2', 'b2bStep3', 'b2bStep4'].map((key, i) => (
            <div 
              key={key} 
              className={`p-2 border-b-2 transition ${step === i + 1 ? 'border-amber-600 text-amber-700 bg-amber-50' : 'border-slate-300 text-slate-400'}`}
            >
              {t(key)}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[#2b1810]">{t('b2bOriginRoast')}</h3>
            <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
              <div>
                <label className="block font-bold text-slate-600 mb-1">{t('b2bEstate')}</label>
                <select 
                  value={formData.origin} 
                  onChange={e => updateFormData('origin', e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  <option value="Esmeraldas, Ecuador">{t('estateEsmeraldas')}</option>
                  <option value="Piura Blanco, Peru">{t('estatePiura')}</option>
                  <option value="Sambirano, Madagascar">{t('estateSambirano')}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">{t('b2bTargetCacao')}</label>
                <input 
                  type="number" 
                  value={formData.targetPercentage} 
                  min="0"
                  max="100"
                  step="1"
                  required
                  aria-invalid={Boolean(validationErrors.targetPercentage)}
                  aria-describedby={validationErrors.targetPercentage ? 'b2b-percentage-error' : undefined}
                  onChange={e => updateFormData('targetPercentage', e.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                />
                {validationErrors.targetPercentage && <p id="b2b-percentage-error" className="mt-1 text-red-700">{t(validationErrors.targetPercentage)}</p>}
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1" htmlFor="b2b-roast">{t('b2bRoast')}</label>
                <select
                  id="b2b-roast"
                  required
                  value={formData.roast}
                  aria-invalid={Boolean(validationErrors.roast)}
                  aria-describedby={validationErrors.roast ? 'b2b-roast-error' : undefined}
                  onChange={event => updateFormData('roast', event.target.value)}
                  className="w-full border border-slate-300 rounded p-2"
                >
                  <option value="light">{t('b2bRoastLight')}</option>
                  <option value="medium">{t('b2bRoastMedium')}</option>
                  <option value="dark">{t('b2bRoastDark')}</option>
                </select>
                {validationErrors.roast && <p id="b2b-roast-error" className="mt-1 text-red-700">{t(validationErrors.roast)}</p>}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[#2b1810]">{t('b2bMoldTitle')}</h3>
            <label className="flex items-center gap-3 text-sm cursor-pointer">
              <input 
                type="checkbox" 
                checked={formData.moldRequired} 
                  onChange={e => updateFormData('moldRequired', e.target.checked)}
                className="rounded text-amber-600"
              />
              <span>{t('b2bMoldDescription')}</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[#2b1810]">{t('b2bPackagingTitle')}</h3>
            <div className="grid grid-cols-1 gap-4 text-xs font-bold text-center sm:grid-cols-3">
              {[
                { value: 'Standard Kraft', key: 'packagingStandard' },
                { value: 'Luxury Rigid Box', key: 'packagingLuxury' },
                { value: 'Custom Foil Stamped', key: 'packagingFoil' },
              ].map(tier => (
                <div 
                  key={tier.value} 
                  onClick={() => updateFormData('packagingTier', tier.value)}
                  role="radio"
                  aria-checked={formData.packagingTier === tier.value}
                  tabIndex={0}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') updateFormData('packagingTier', tier.value);
                  }}
                  className={`p-4 border rounded cursor-pointer ${formData.packagingTier === tier.value ? 'border-amber-600 bg-amber-50' : 'border-slate-200'}`}
                >
                  {t(tier.key)}
                </div>
              ))}
            </div>
            {validationErrors.packagingTier && <p className="text-left text-red-700" role="alert">{t(validationErrors.packagingTier)}</p>}
            <div className="max-w-xs">
              <label className="block font-bold text-slate-600 mb-1" htmlFor="b2b-volume">{t('b2bVolume')}</label>
              <input
                id="b2b-volume"
                type="number"
                min="1"
                step="1"
                required
                value={formData.estimatedUnits}
                aria-invalid={Boolean(validationErrors.estimatedUnits)}
                aria-describedby={validationErrors.estimatedUnits ? 'b2b-volume-error' : undefined}
                onChange={event => updateFormData('estimatedUnits', event.target.value)}
                className="w-full border border-slate-300 rounded p-2"
              />
              {validationErrors.estimatedUnits && <p id="b2b-volume-error" className="mt-1 text-red-700">{t(validationErrors.estimatedUnits)}</p>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg text-[#2b1810]">{t('b2bUploadTitle')}</h3>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center text-xs text-slate-500">
              <label className="relative inline-flex cursor-pointer items-center rounded bg-amber-600 px-4 py-2 font-bold text-white">
                {t('chooseFile')}
                <input
                  type="file"
                  accept=".ai,.pdf,.svg,.eps"
                  aria-label={t('chooseFile')}
                  onChange={e => updateFormData('techPack', e.target.files[0] ?? null)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              <p className="mt-2">{formData.techPack ? t('fileAttached', { fileName: formData.techPack.name }) : t('noFileChosen')}</p>
              <p className="mt-1">{t('b2bFileRequirements')}</p>
              {validationErrors.techPack && <p className="mt-2 text-red-700" role="alert">{t(validationErrors.techPack)}</p>}
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-100">
          <button 
            disabled={step === 1}
            onClick={() => {
              setValidationErrors({});
              setStep(current => current - 1);
            }}
            className="text-xs font-bold text-slate-500 disabled:opacity-40"
          >
            &larr; {t('previousStep')}
          </button>
          
          {step < 4 ? (
            <button 
              onClick={handleContinue}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded shadow transition"
            >
              {t('continueToStep', { step: step + 1 })} &rarr;
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold rounded shadow transition"
            >
              {t(isSubmitting ? 'b2bSubmitting' : 'submitQuote')}
            </button>
          )}
        </div>
        {submissionMessage && (
          <p className={submissionMessage === 'b2bQuoteSubmitted' || submissionMessage === 'b2bQuoteSubmittedWithId' ? 'text-sm text-emerald-800' : 'text-sm text-red-700'} role="status">
            {submissionMessage === 'b2bQuoteSubmittedWithId'
              ? t(submissionMessage, { quoteId: submittedQuoteId })
              : t(submissionMessage)}
          </p>
        )}
      </div>
    </div>
  );
};