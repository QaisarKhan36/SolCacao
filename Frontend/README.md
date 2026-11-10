# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## SolCacao Product API

The catalog uses bilingual sample products by default in Vite development. Set `VITE_USE_DEMO_PRODUCTS=true` to force demo products or `VITE_USE_DEMO_PRODUCTS=false` to use the product API. When unset, production builds use the API.

The catalog loads product records from `GET /api/products`. Set `VITE_API_BASE_URL` in a local `.env` file if the backend runs on another origin:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_USE_DEMO_PRODUCTS=false
VITE_USE_DEMO_AUTH=false
```

The frontend sends `search`, repeatable `origin`, `cacaoPctMin`, `cacaoPctMax`, `priceMin`, and `priceMax` query parameters. The endpoint may return a product array or an object containing `products` (also supported as `data.products`). Each product needs `id`, `_id`, or `sku`, a numeric `price`, a numeric `cacaoPct` or `cacaoPercentage`, an `origin`, and explicit boolean `samplerEligible` and `seasonal` fields. Set `samplerEligible: true` to include a catalog product in sampler choices; set `seasonal: true` to include it in the home seasonal showcase. Set either to `false` to exclude that product from the corresponding feature. `name` and `description` may be plain strings or localized objects such as `{ "en": "...", "es": "..." }`. `imageUrl` is optional.

When demo mode is disabled, the catalog displays a retryable error state if the product API is unavailable.

## Account API

Development uses demo authentication by default. Set `VITE_USE_DEMO_AUTH=false` to connect the account form to the backend. Registration posts `{ name, email, password, accountType }` to `POST /api/auth/register`; B2B registration also includes `companyName` and `taxId`. Login posts `{ email, password }` to `POST /api/auth/login`.

Both endpoints should return an access token (`accessToken` or `token`). The frontend stores it as `solcacao_access_token` and requests the current profile from `GET /api/auth/me` with a Bearer token. The profile is stored as `solcacao_account` and held in application state. On reload, the frontend validates the stored token by requesting `/api/auth/me` again. The backend should return an account object with fields such as `id`, `name`, `email`, and `accountType`.

Signed-in users can edit their profile from the Account menu. The form sends editable fields (`name`, `email`, and B2B `companyName`/`taxId`) to `PATCH /api/auth/me` with the bearer token. The backend should validate and persist the changes and return the updated account object. In demo-auth mode, updates are saved to browser storage only.

## B2B Quote API

The wizard submits quote requests to `POST /api/b2b/quote` as `multipart/form-data`. The request includes `origin`, `targetPercentage`, `roast`, `moldRequired`, `packagingTier`, and `estimatedUnits`. If a tech pack is selected, it is uploaded in the `brandVector` field (AI, PDF, SVG, or EPS; maximum 10 MB).

The endpoint is intended for authenticated B2B accounts. The frontend sends `Authorization: Bearer <token>` using the access token stored at `localStorage.solcacao_access_token`; the backend should validate the token, associate the quote with its account, authorize B2B access, and return JSON such as `{ "quoteId": "..." }`. The current demo sign-in does not issue a token, so submission remains unavailable until the account backend stores one.

## Account Cart Sync API

When an access token is available at `localStorage.solcacao_access_token`, sign-in attempts `POST /api/cart/sync` with `Authorization: Bearer <token>` and a JSON array of guest items: `[{ "productId": "...", "quantity": 2 }]`. The backend should merge those items into the signed-in account's cart and return the canonical merged cart as `{ "items": [{ "productId": "...", "quantity": 2, "product": { "id": "...", "price": 9.5, "name": { "en": "...", "es": "..." } } }] }`. A bare array response is also accepted. The frontend replaces local cart state only when a valid cart is returned.

On sign-out, the frontend attempts `POST /api/cart/persist` with the same bearer token and JSON item array to save the current account cart. The local cart remains in browser storage after sign-out and if either request fails. The current demo sign-in does not issue an access token, so these calls are skipped until authentication is connected.

## Contact Inquiry API

The Contact form sends `POST /api/inquiries` with a JSON body containing `name`, `email`, `category`, and a trimmed `message` (10–5,000 characters). When `category` is `sampler`, it also includes `samplerSelections`, an array of selected catalog product IDs. Only products with `samplerEligible: true` are offered. This is a public inquiry endpoint and does not require an account token. The backend should validate the payload, persist or route the inquiry, and send notifications through its mail service. The frontend expects a successful `2xx` response; it does not simulate delivery when the API is unavailable.
