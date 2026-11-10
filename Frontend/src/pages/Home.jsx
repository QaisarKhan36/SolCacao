import React, { useEffect, useState } from 'react';
import heroArtwork from '../assets/hero.png';
import cacaoChocolateImage from '../assets/CacaoChocolate.jpg';
import winterChocolateImage from '../assets/Winter_Chocolate.jpg';
import shareChocolateImage from '../assets/ShareChocolate.jpg';
import { useLanguage } from '../context/LanguageContext';
import { loadProducts } from '../services/productCatalog';
import { getLocalizedProductText } from '../utils/products';

const HERO_SLIDES = [
  {
    eyebrow: 'homeEyebrow',
    title: 'heroTitle',
    description: 'heroSubtitle',
    image: cacaoChocolateImage,
    imageIndex: 0,
    primaryLabel: 'shopRetail',
    primaryScreen: 'catalog',
    secondaryLabel: 'b2bWholesale',
    secondaryScreen: 'b2b',
  },
  {
    eyebrow: 'heroSlide2Eyebrow',
    title: 'heroSlide2Title',
    description: 'heroSlide2Subtitle',
    image: winterChocolateImage,
    imageIndex: 1,
    primaryLabel: 'heroSlide2Action',
    primaryScreen: 'catalog',
    secondaryLabel: 'heroSlide2Secondary',
    secondaryScreen: 'contact',
  },
  {
    eyebrow: 'heroSlide3Eyebrow',
    title: 'heroSlide3Title',
    description: 'heroSlide3Subtitle',
    image: shareChocolateImage,
    imageIndex: 2,
    primaryLabel: 'heroSlide3Action',
    primaryScreen: 'b2b',
    secondaryLabel: 'heroSlide3Secondary',
    secondaryScreen: 'contact',
  },
];

export const Home = ({ setCurrentScreen }) => {
  const { lang, t } = useLanguage();
  const [activeSlide, setActiveSlide] = useState(0);
  const [seasonalProducts, setSeasonalProducts] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    loadProducts({}, { signal: controller.signal })
      .then(products => setSeasonalProducts(products.filter(product => product.seasonal)))
      .catch(() => setSeasonalProducts([]));

    return () => controller.abort();
  }, []);

  const slide = HERO_SLIDES[activeSlide];
  const slideImage = slide.image || seasonalProducts[slide.imageIndex]?.imageUrl || heroArtwork;
  const goToSlide = (offset) => {
    setActiveSlide(current => (current + offset + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  return (
    <div>
      <section className="relative isolate min-h-[480px] overflow-hidden bg-[#2b1810] text-white" aria-roledescription="carousel" aria-label={t('homeHero')}>
        <img
          key={slideImage}
          src={slideImage}
          alt=""
          aria-hidden="true"
          onError={event => {
            event.currentTarget.src = heroArtwork;
          }}
          className="absolute inset-y-0 right-0 h-full w-full object-cover opacity-40 md:w-3/5 md:opacity-75"
        />
        <div className="absolute inset-0 -z-0 bg-gradient-to-r from-[#2b1810] via-[#2b1810]/90 to-[#2b1810]/35" />
        <div className="relative z-10 mx-auto flex min-h-[480px] max-w-7xl items-center px-6 py-14 sm:px-8">
          <div className="max-w-2xl space-y-5">
            <span className="text-xs font-bold uppercase text-amber-300">{t(slide.eyebrow)}</span>
            <h1 className="font-serif text-4xl font-black leading-tight sm:text-6xl">{t(slide.title)}</h1>
            <p className="max-w-xl text-base text-amber-50 sm:text-lg">{t(slide.description)}</p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button onClick={() => setCurrentScreen(slide.primaryScreen)} className="rounded bg-amber-500 px-6 py-3 font-bold text-slate-950 hover:bg-amber-400">
                {t(slide.primaryLabel)}
              </button>
              <button onClick={() => setCurrentScreen(slide.secondaryScreen)} className="rounded border border-amber-200/70 px-6 py-3 font-bold text-white hover:bg-white/10">
                {t(slide.secondaryLabel)}
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 right-6 z-20 flex items-center gap-3 sm:right-8">
          <button type="button" aria-label={t('previousSlide')} onClick={() => goToSlide(-1)} className="grid size-9 place-items-center rounded-full border border-white/50 bg-black/20 text-lg hover:bg-black/40">&larr;</button>
          <div className="flex gap-2" role="group" aria-label={t('heroSlides')}>
            {HERO_SLIDES.map((heroSlide, index) => (
              <button
                key={heroSlide.title}
                type="button"
                aria-label={t('goToSlide', { number: index + 1 })}
                aria-current={index === activeSlide ? 'true' : undefined}
                onClick={() => setActiveSlide(index)}
                className={`size-2.5 rounded-full ${index === activeSlide ? 'bg-amber-300' : 'bg-white/60'}`}
              />
            ))}
          </div>
          <button type="button" aria-label={t('nextSlide')} onClick={() => goToSlide(1)} className="grid size-9 place-items-center rounded-full border border-white/50 bg-black/20 text-lg hover:bg-black/40">&rarr;</button>
        </div>
      </section>

      <section className="bg-[#f5eee8] py-14" aria-labelledby="seasonal-showcase-title">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="seasonal-showcase-title" className="font-serif text-3xl font-black text-[#2b1810]">{t('seasonalShowcase')}</h2>
              <p className="mt-1 text-sm text-slate-600">{t('seasonalDescription')}</p>
            </div>
            <button onClick={() => setCurrentScreen('catalog')} className="self-start text-sm font-bold text-amber-900 underline sm:self-auto">
              {t('seasonalShop')}
            </button>
          </div>

          {seasonalProducts.length === 0 ? (
            <p className="py-8 text-sm text-slate-600">{t('seasonalNoProducts')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {seasonalProducts.map(product => {
                const name = getLocalizedProductText(product.name, lang) || product.sku || product.id;
                const description = getLocalizedProductText(product.description, lang);

                return (
                  <article key={product.id} className="overflow-hidden border border-[#ded0c4] bg-white">
                    <div className="relative h-56 bg-[#eaded4]">
                      <img
                        src={product.imageUrl || heroArtwork}
                        alt={name}
                        loading="lazy"
                        onError={event => {
                          event.currentTarget.src = heroArtwork;
                        }}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute left-3 top-3 bg-amber-100 px-2 py-1 text-[11px] font-bold uppercase text-amber-950">{t('seasonalTag')}</span>
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-[#2b1810]">{name}</h3>
                        <span className="shrink-0 font-bold text-amber-800">${product.price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-500">{product.origin} · {product.cacaoPct}%</p>
                      {description && <p className="text-sm text-slate-600">{description}</p>}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="max-w-6xl mx-auto grid grid-cols-1 gap-8 px-6 py-14 md:grid-cols-3">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-800 flex items-center justify-center rounded font-bold">01</div>
          <h3 className="font-bold text-lg text-[#2b1810]">{t('feature1Title')}</h3>
          <p className="text-sm text-slate-600">{t('feature1Description')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-800 flex items-center justify-center rounded font-bold">02</div>
          <h3 className="font-bold text-lg text-[#2b1810]">{t('feature2Title')}</h3>
          <p className="text-sm text-slate-600">{t('feature2Description')}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-3">
          <div className="w-10 h-10 bg-amber-100 text-amber-800 flex items-center justify-center rounded font-bold">03</div>
          <h3 className="font-bold text-lg text-[#2b1810]">{t('feature3Title')}</h3>
          <p className="text-sm text-slate-600">{t('feature3Description')}</p>
        </div>
      </section>
    </div>
  );
};