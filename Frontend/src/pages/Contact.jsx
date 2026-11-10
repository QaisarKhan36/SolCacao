import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { submitInquiry } from '../services/inquiryApi';
import { loadProducts } from '../services/productCatalog';
import { getLocalizedProductText } from '../utils/products';

const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 5000;
const EMPTY_INQUIRY = { name: '', email: '', category: 'sampler', message: '' };

export const Contact = () => {
  const { lang, t } = useLanguage();
  const [inquiry, setInquiry] = useState(EMPTY_INQUIRY);
  const [samplerSelections, setSamplerSelections] = useState(['esmeraldas', 'sambirano']);
  const [samplerProducts, setSamplerProducts] = useState([]);
  const [samplerProductsLoading, setSamplerProductsLoading] = useState(true);
  const [samplerProductsError, setSamplerProductsError] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [submitStatus, setSubmitStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    loadProducts({}, { signal: controller.signal })
      .then(products => {
        if (!isActive) return;
        const eligibleProducts = products.filter(product => product.samplerEligible);
        setSamplerProducts(eligibleProducts);
        setSamplerSelections(currentSelections => {
          const validSelections = currentSelections.filter(id => eligibleProducts.some(product => product.id === id));
          return validSelections.length > 0
            ? validSelections.slice(0, 4)
            : eligibleProducts.slice(0, 2).map(product => product.id);
        });
      })
      .catch(error => {
        if (error.name !== 'AbortError' && isActive) setSamplerProductsError(true);
      })
      .finally(() => {
        if (isActive) setSamplerProductsLoading(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (inquiry.category === 'sampler' && (samplerProductsLoading || samplerProductsError || samplerSelections.length === 0)) {
      setSubmitStatus('samplerProductsUnavailable');
      return;
    }
    const trimmedMessage = inquiry.message.trim();
    if (!trimmedMessage) {
      setMessageError('messageRequired');
      return;
    }
    if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
      setMessageError('messageTooShort');
      return;
    }

    setMessageError('');
    setSubmitStatus('');
    setIsSubmitting(true);
    try {
      await submitInquiry({
        ...inquiry,
        message: trimmedMessage,
        samplerSelections: inquiry.category === 'sampler' ? samplerSelections : undefined,
      });
      setInquiry(EMPTY_INQUIRY);
      setSamplerSelections(samplerProducts.slice(0, 2).map(product => product.id));
      setSubmitStatus('inquirySent');
    } catch {
      setSubmitStatus('inquirySendFailed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h1 className="font-serif font-black text-2xl text-[#2b1810]">{t('contactTitle')}</h1>
        <form className="space-y-3 text-xs" onSubmit={handleSubmit}>
          <div>
            <label className="block font-bold text-slate-600 mb-1">{t('yourName')}</label>
            <input
              type="text"
              required
              value={inquiry.name}
              onChange={event => setInquiry(current => ({ ...current, name: event.target.value }))}
              className="w-full border border-slate-300 rounded p-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">{t('businessEmail')}</label>
            <input
              type="email"
              required
              value={inquiry.email}
              onChange={event => setInquiry(current => ({ ...current, email: event.target.value }))}
              className="w-full border border-slate-300 rounded p-2"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">{t('category')}</label>
            <select
              value={inquiry.category}
              onChange={event => {
                setInquiry(current => ({ ...current, category: event.target.value }));
                setSubmitStatus('');
              }}
              className="w-full border border-slate-300 rounded p-2 bg-white"
            >
              <option value="sampler">{t('categorySampler')}</option>
              <option value="wholesale">{t('categoryWholesale')}</option>
              <option value="gifts">{t('categoryGifts')}</option>
              <option value="support">{t('categorySupport')}</option>
            </select>
          </div>
          {inquiry.category === 'sampler' && (
            <fieldset className="space-y-4 border-t border-slate-200 pt-4">
              <legend className="font-serif font-bold text-lg text-[#2b1810]">{t('samplerTitle')}</legend>
              <p className="text-xs text-slate-600">{t('samplerDescription')}</p>
              {samplerProductsLoading ? (
                <p className="text-sm text-slate-600">{t('samplerProductsLoading')}</p>
              ) : samplerProductsError ? (
                <p className="text-sm text-red-700" role="alert">{t('samplerProductsUnavailable')}</p>
              ) : samplerProducts.length === 0 ? (
                <p className="text-sm text-slate-600">{t('samplerNoEligibleProducts')}</p>
              ) : (
                <div className="space-y-3">
                  {samplerSelections.map((productId, index) => (
                    <div key={`${index}-${productId}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <label className="w-24 shrink-0 font-semibold text-slate-600" htmlFor={`sampler-origin-${index}`}>
                      {t('slot', { number: index + 1 })}
                    </label>
                    <select
                      id={`sampler-origin-${index}`}
                      value={productId}
                      onChange={event => setSamplerSelections(current => current.map((selection, slotIndex) => (
                        slotIndex === index ? event.target.value : selection
                      )))}
                      className="min-w-0 flex-1 rounded border border-slate-300 bg-white p-2"
                    >
                      {samplerProducts.map(product => {
                        const productName = getLocalizedProductText(product.name, lang) || product.sku || product.id;
                        return (
                          <option key={product.id} value={product.id}>
                            {productName} · {product.cacaoPct}% · {product.origin}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      type="button"
                      disabled={samplerSelections.length <= 1}
                      onClick={() => setSamplerSelections(current => current.filter((_, slotIndex) => slotIndex !== index))}
                      className="text-left text-xs font-semibold text-red-700 underline disabled:opacity-40 sm:text-center"
                    >
                      {t('remove')}
                    </button>
                  </div>
                  ))}
                </div>
              )}
              {!samplerProductsLoading && !samplerProductsError && samplerProducts.length > 0 && samplerSelections.length < 4 && (
                <button
                  type="button"
                  onClick={() => setSamplerSelections(current => [...current, samplerProducts[0].id])}
                  className="text-xs font-semibold text-amber-800 underline"
                >
                  + {t('addOrigin')}
                </button>
              )}
              <div className="flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-xs text-emerald-900">{t('tastingConsultation')}</h2>
                  <p className="text-[11px] text-emerald-800">{t('tastingConsultationDescription')}</p>
                </div>
                <a
                  href={`https://wa.me/18005550199?text=${encodeURIComponent(t('whatsappMessage'))}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-emerald-800 underline"
                >
                  {t('whatsappConcierge')} &rarr;
                </a>
              </div>
            </fieldset>
          )}
          <div>
            <label className="block font-bold text-slate-600 mb-1" htmlFor="contact-message">{t('contactMessage')}</label>
            <textarea
              id="contact-message"
              rows="3"
              required
              minLength={MIN_MESSAGE_LENGTH}
              maxLength={MAX_MESSAGE_LENGTH}
              value={inquiry.message}
              aria-invalid={Boolean(messageError)}
              aria-describedby={messageError ? 'contact-message-error' : 'contact-message-count'}
              onChange={event => {
                const message = event.target.value;
                setInquiry(current => ({ ...current, message }));
                setSubmitStatus('');
                setMessageError(message.trim().length < MIN_MESSAGE_LENGTH
                  ? (message.trim() ? 'messageTooShort' : 'messageRequired')
                  : '');
              }}
              className="w-full border border-slate-300 rounded p-2"
            />
            <div className="mt-1 flex justify-between gap-4 text-[11px] text-slate-500">
              {messageError
                ? <p id="contact-message-error" className="text-red-700" role="alert">{t(messageError)}</p>
                : <p id="contact-message-count">{t('messageLengthHint', { min: MIN_MESSAGE_LENGTH, max: MAX_MESSAGE_LENGTH })}</p>}
              <span>{inquiry.message.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting || (inquiry.category === 'sampler' && samplerProductsLoading)} className="w-full py-2.5 bg-[#2b1810] hover:bg-[#43281c] disabled:opacity-60 text-amber-400 font-bold rounded text-xs shadow transition">
            {t(isSubmitting ? 'inquirySending' : 'dispatchInquiry')}
          </button>
          {submitStatus && (
            <p className={submitStatus === 'inquirySent' ? 'text-emerald-800' : 'text-red-700'} role="status">
              {t(submitStatus)}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};