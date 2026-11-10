import React, { useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { loadProducts, NORMALIZED_DEMO_PRODUCTS, USE_DEMO_PRODUCTS } from '../services/productCatalog';
import { getLocalizedProductText } from '../utils/products';

const DEMO_ORIGINS = [...new Set(NORMALIZED_DEMO_PRODUCTS.map(product => product.origin))]
  .sort((first, second) => first.localeCompare(second));

export const Catalog = ({ focusSearchRequest = 0 }) => {
  const { addToCart, setIsDrawerOpen } = useCart();
  const { lang, t } = useLanguage();
  const searchInputRef = useRef(null);
  const [products, setProducts] = useState(() => USE_DEMO_PRODUCTS ? NORMALIZED_DEMO_PRODUCTS : []);
  const [availableOrigins, setAvailableOrigins] = useState(() => USE_DEMO_PRODUCTS ? DEMO_ORIGINS : []);
  const [selectedOrigins, setSelectedOrigins] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [minCacaoPct, setMinCacaoPct] = useState('0');
  const [maxCacaoPct, setMaxCacaoPct] = useState('100');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [seasonalOnly, setSeasonalOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(!USE_DEMO_PRODUCTS);
  const [isShowingDemoProducts, setIsShowingDemoProducts] = useState(USE_DEMO_PRODUCTS);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const invalidCacaoRange = minCacaoPct !== '' && maxCacaoPct !== '' && Number(minCacaoPct) > Number(maxCacaoPct);
  const invalidPriceRange = minPrice !== '' && maxPrice !== '' && Number(minPrice) > Number(maxPrice);
  const hasInvalidRange = invalidCacaoRange || invalidPriceRange;

  useEffect(() => {
    if (focusSearchRequest === 0) return;
    searchInputRef.current?.focus({ preventScroll: true });
    searchInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusSearchRequest]);

  useEffect(() => {
    if (USE_DEMO_PRODUCTS) return undefined;
    if (hasInvalidRange) return undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      setIsLoading(true);
      setError('');

      loadProducts({
        search,
        origins: selectedOrigins ?? [],
        minCacaoPct,
        maxCacaoPct,
        minPrice,
        maxPrice,
        seasonalOnly,
      }, { signal: controller.signal })
        .then(result => {
          setProducts(result);
          setIsShowingDemoProducts(USE_DEMO_PRODUCTS);
          setAvailableOrigins(currentOrigins => [...new Set([
            ...currentOrigins,
            ...result.map(product => product.origin).filter(Boolean),
          ])].sort((first, second) => first.localeCompare(second)));
        })
        .catch(requestError => {
          if (requestError.name === 'AbortError') return;
          setProducts([]);
          setError('productsLoadError');
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [search, selectedOrigins, minCacaoPct, maxCacaoPct, minPrice, maxPrice, seasonalOnly, retryCount, hasInvalidRange]);

  const filteredProducts = products.filter(product => {
    const originMatches = selectedOrigins === null || selectedOrigins.includes(product.origin);
    const cacaoMatches = (minCacaoPct === '' || product.cacaoPct >= Number(minCacaoPct))
      && (maxCacaoPct === '' || product.cacaoPct <= Number(maxCacaoPct));
    const priceMatches = (minPrice === '' || product.price >= Number(minPrice))
      && (maxPrice === '' || product.price <= Number(maxPrice));
    const seasonalMatches = !seasonalOnly || product.seasonal;
    const searchContent = [product.name, product.description]
      .flatMap(value => typeof value === 'string' ? [value] : Object.values(value ?? {}))
      .concat(product.origin, product.sku ?? '')
      .join(' ')
      .toLocaleLowerCase();
    const searchMatches = !search || searchContent.includes(search.toLocaleLowerCase());

    return originMatches && cacaoMatches && priceMatches && seasonalMatches && searchMatches;
  });
  const displayedProducts = hasInvalidRange ? [] : filteredProducts;

  const toggleOrigin = (origin, checked) => {
    setSelectedOrigins(currentOrigins => {
      const origins = currentOrigins ?? availableOrigins;
      return checked
        ? [...new Set([...origins, origin])]
        : origins.filter(selectedOrigin => selectedOrigin !== origin);
    });
  };

  const resetFilters = () => {
    setSelectedOrigins(null);
    setSearchInput('');
    setSearch('');
    setMinCacaoPct('0');
    setMaxCacaoPct('100');
    setMinPrice('');
    setMaxPrice('');
    setSeasonalOnly(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-6">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <h1 className="font-serif text-3xl font-black text-[#2b1810]">{t('catalogTitle')}</h1>
        <form
          className="flex w-full gap-2 md:max-w-xl"
          role="search"
          onSubmit={event => {
            event.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <label className="sr-only" htmlFor="catalog-search">{t('searchProducts')}</label>
          <input
            ref={searchInputRef}
            id="catalog-search"
            type="search"
            value={searchInput}
            onChange={event => setSearchInput(event.target.value)}
            placeholder={t('searchPlaceholder')}
            className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button type="submit" className="rounded bg-[#2b1810] px-4 py-2 text-sm font-bold text-amber-300">
            {t('search')}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="w-full self-start space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:w-72">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="font-bold text-[#2b1810]">{t('filters')}</h2>
            <button type="button" onClick={resetFilters} className="text-xs font-semibold text-amber-800 underline">
              {t('resetFilters')}
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-bold uppercase text-slate-500">{t('origin')}</legend>
            {availableOrigins.length === 0 && !isLoading ? (
              <p className="text-sm text-slate-500">{t('noOrigins')}</p>
            ) : availableOrigins.map(origin => (
              <label key={origin} className="mb-1 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedOrigins === null || selectedOrigins.includes(origin)}
                  onChange={event => toggleOrigin(origin, event.target.checked)}
                  className="rounded text-amber-600"
                />
                <span>{origin}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-bold uppercase text-slate-500">{t('cacaoRange')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-600">
                {t('minimum')} (%)
                <input type="number" min="0" max="100" value={minCacaoPct} onChange={event => setMinCacaoPct(event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
              </label>
              <label className="text-xs text-slate-600">
                {t('maximum')} (%)
                <input type="number" min="0" max="100" value={maxCacaoPct} onChange={event => setMaxCacaoPct(event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="mb-2 text-xs font-bold uppercase text-slate-500">{t('priceRange')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-slate-600">
                {t('minimum')} ($)
                <input type="number" min="0" step="0.01" value={minPrice} onChange={event => setMinPrice(event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
              </label>
              <label className="text-xs text-slate-600">
                {t('maximum')} ($)
                <input type="number" min="0" step="0.01" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} className="mt-1 w-full rounded border border-slate-300 p-2 text-sm" />
              </label>
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={seasonalOnly}
              onChange={event => setSeasonalOnly(event.target.checked)}
              className="rounded text-amber-600"
            />
            <span>{t('seasonalOnly')}</span>
          </label>
        </aside>

        <section className="min-w-0 flex-1" aria-live="polite">
          {isShowingDemoProducts && (
            <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950" role="status">
              {t('demoProductsNotice')}
            </p>
          )}
          <p className="mb-4 text-sm text-slate-600">{t('productResults', { count: displayedProducts.length })}</p>

          {hasInvalidRange ? (
            <p className="py-12 text-center text-sm text-red-800" role="alert">{t('invalidFilters')}</p>
          ) : isLoading ? (
            <p className="py-12 text-center text-slate-500">{t('loadingProducts')}</p>
          ) : error ? (
            <div className="py-12 text-center" role="alert">
              <p className="mb-3 text-sm text-red-800">{t(error)}</p>
              <button type="button" onClick={() => setRetryCount(count => count + 1)} className="rounded bg-[#2b1810] px-4 py-2 text-sm font-bold text-amber-300">
                {t('retry')}
              </button>
            </div>
          ) : displayedProducts.length === 0 ? (
            <p className="py-12 text-center text-slate-500">{t('noProducts')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {displayedProducts.map(product => {
                const name = getLocalizedProductText(product.name, lang) || product.sku || t('unnamedProduct');
                const description = getLocalizedProductText(product.description, lang);

                return (
                  <article key={product.id} className="flex flex-col justify-between overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="relative flex h-44 items-center justify-center bg-[#f2e8e5] px-4 text-center font-serif font-bold text-[#6f3d2a]">
                      {product.imageUrl ? <img src={product.imageUrl} alt={name} loading="lazy" className="h-full w-full object-cover" /> : name}
                      {product.seasonal && (
                          <span className="absolute left-3 top-3 bg-amber-100 px-2 py-1 font-sans text-[11px] font-bold uppercase text-amber-950">
                          {t('seasonalTag')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="font-bold text-[#2b1810]">{name}</h2>
                          <span className="shrink-0 font-bold text-amber-700">${product.price.toFixed(2)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{product.origin} · {product.cacaoPct}%</p>
                        {description && <p className="mt-2 text-xs text-slate-600">{description}</p>}
                      </div>
                      <button
                        onClick={() => {
                          addToCart(product);
                          setIsDrawerOpen(true);
                        }}
                        className="w-full rounded bg-[#2b1810] py-2 font-bold text-amber-400 transition hover:bg-[#43281c]"
                      >
                        {t('addToCart')}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};