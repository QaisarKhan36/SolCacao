// npm test
// End-to-end API tests against a real MySQL 8 database. They use a SEPARATE
// database (solcacao_test by default) that is rebuilt from the SQL files on
// every run, so your development data in "solcacao" is never touched.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

const uploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solcacao-test-uploads-'));
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.TEST_DB_NAME ?? 'solcacao_test';
process.env.JWT_SECRET ||= 'automated-test-secret-0123456789-abcdefghijklmnop';
process.env.ADMIN_API_KEY = 'test-admin-key';
process.env.UPLOADS_DIR = uploadsDir;
process.env.SMTP_HOST = ''; // never send real email from tests

// Imported after the environment is set, because config.js reads it on load.
const { setupDatabase } = await import('../scripts/db-setup.js');
const { createApp } = await import('../src/app.js');
const { pool } = await import('../src/db.js');

const BRAND_DIR = path.join(uploadsDir, 'brand-vectors');
const DEMO_PASSWORD = 'Cacao2026!';
const PDF_BYTES = '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\n%%EOF\n';
let server;
let baseUrl;

before(async () => {
  await setupDatabase({ log: () => {} });
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
  await pool.end();
  await fs.rm(uploadsDir, { recursive: true, force: true });
});

const api = async (method, url, { body, token, form, headers = {} } = {}) => {
  const init = { method, headers: { ...headers } };
  if (token) init.headers.Authorization = `Bearer ${token}`;
  if (form) {
    init.body = form;
  } else if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const response = await fetch(`${baseUrl}${url}`, init);
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: response.status, body: json, headers: response.headers };
};

const login = async email => {
  const { status, body } = await api('POST', '/api/auth/login', { body: { email, password: DEMO_PASSWORD } });
  assert.equal(status, 200);
  return body.accessToken;
};

const quoteForm = (overrides = {}, file) => {
  const form = new FormData();
  const fields = {
    origin: 'Esmeraldas, Ecuador',
    targetPercentage: '75',
    roast: 'medium',
    moldRequired: 'true',
    packagingTier: 'Luxury Rigid Box',
    estimatedUnits: '500',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) form.append(key, value);
  if (file) form.append('brandVector', new Blob([file.content]), file.name);
  return form;
};

const uploadedFiles = async () => (await fs.readdir(BRAND_DIR)).sort();
const fieldsIn = body => body.details.map(detail => detail.field).sort();

describe('basics', () => {
  test('health check reports the database as connected', async () => {
    const { status, body } = await api('GET', '/api/health');
    assert.equal(status, 200);
    assert.deepEqual(body, { status: 'ok', database: 'connected' });
  });

  test('unknown routes return JSON 404', async () => {
    const { status, body } = await api('GET', '/api/does-not-exist');
    assert.equal(status, 404);
    assert.equal(body.code, 'not_found');
  });

  test('malformed JSON returns 400 invalid_json', async () => {
    const { status, body } = await api('POST', '/api/inquiries', { body: '{"name": ' });
    assert.equal(status, 400);
    assert.equal(body.code, 'invalid_json');
  });

  test('CORS allows the frontend origin and not others', async () => {
    const allowed = await api('OPTIONS', '/api/products', {
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET' },
    });
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');

    const blocked = await api('OPTIONS', '/api/products', {
      headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' },
    });
    assert.equal(blocked.headers.get('access-control-allow-origin'), null);
  });
});

describe('products', () => {
  test('lists every active product in the shape the frontend expects', async () => {
    const { status, body } = await api('GET', '/api/products');
    assert.equal(status, 200);
    assert.equal(body.count, 9);
    for (const product of body.products) {
      assert.equal(typeof product.id, 'string');
      assert.equal(typeof product.price, 'number');
      assert.equal(typeof product.cacaoPct, 'number');
      assert.equal(typeof product.samplerEligible, 'boolean');
      assert.equal(typeof product.seasonal, 'boolean');
      assert.ok(product.name.en && product.name.es);
      assert.match(product.imageUrl, /^http:\/\/127\.0\.0\.1:\d+\/images\/products\//);
    }
  });

  test('filters by origin and cacao percentage', async () => {
    const { body } = await api('GET', '/api/products?origin=Peru&cacaoPctMin=80');
    assert.deepEqual(body.products.map(product => product.id).sort(), ['PIU-100', 'SOL-85-PE']);
  });

  test('accepts the origin filter more than once', async () => {
    const { body } = await api('GET', '/api/products?origin=Ecuador&origin=Madagascar');
    assert.ok(body.count > 0);
    assert.ok(body.products.every(product => ['Ecuador', 'Madagascar'].includes(product.origin)));
  });

  test('filters by price range', async () => {
    const { body } = await api('GET', '/api/products?priceMin=10&priceMax=12');
    assert.ok(body.products.every(product => product.price >= 10 && product.price <= 12));
    assert.ok(body.products.some(product => product.id === 'SAM-85'));
  });

  test('search is case- and accent-insensitive and covers Spanish text', async () => {
    assert.deepEqual((await api('GET', '/api/products?search=JAZMIN')).body.products.map(p => p.id), ['ESM-72']);
    assert.deepEqual((await api('GET', '/api/products?search=naranja')).body.products.map(p => p.id), ['SAM-70']);
  });

  test('LIKE wildcards typed by a visitor are treated as text', async () => {
    // Unescaped, "_" would match any single character, i.e. every product.
    const { body } = await api('GET', '/api/products?search=_');
    assert.equal(body.count, 0);
    // "%" is a real character in names like "72% Dark Esmeraldas".
    const percent = await api('GET', '/api/products?search=72%25');
    assert.deepEqual(percent.body.products.map(product => product.id), ['ESM-72']);
  });

  test('samplerEligible=true returns only sampler products', async () => {
    const { body } = await api('GET', '/api/products?samplerEligible=true');
    assert.equal(body.count, 6);
    assert.ok(body.products.every(product => product.samplerEligible));
  });

  test('rejects a minimum above the maximum', async () => {
    const { status, body } = await api('GET', '/api/products?cacaoPctMin=90&cacaoPctMax=60');
    assert.equal(status, 400);
    assert.equal(body.code, 'validation_error');
  });

  test('rejects non-numeric filters', async () => {
    const { status, body } = await api('GET', '/api/products?priceMin=cheap');
    assert.equal(status, 400);
    assert.deepEqual(fieldsIn(body), ['priceMin']);
  });

  test('returns one product by SKU, or 404', async () => {
    const found = await api('GET', '/api/products/ESM-72');
    assert.equal(found.status, 200);
    assert.equal(found.body.product.name.es, 'Esmeraldas oscuro 72%');

    const missing = await api('GET', '/api/products/NOPE-1');
    assert.equal(missing.status, 404);
    assert.equal(missing.body.code, 'product_not_found');
  });

  test('product images can be loaded by the frontend origin', async () => {
    const response = await fetch(`${baseUrl}/images/products/cacao-chocolate.jpg`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.equal(response.headers.get('cross-origin-resource-policy'), 'cross-origin');
    await response.arrayBuffer();
  });
});

describe('auth', () => {
  let retailToken;

  test('registers a retail account and returns a token', async () => {
    const { status, body } = await api('POST', '/api/auth/register', {
      body: { name: 'Lucia Fernanda Mora', email: 'Lucia@Example.com', password: 'longpassword1', accountType: 'retail' },
    });
    assert.equal(status, 201);
    assert.ok(body.accessToken);
    assert.equal(body.user.email, 'lucia@example.com');
    assert.equal(body.user.firstName, 'Lucia');
    assert.equal(body.user.lastName, 'Fernanda Mora');
    assert.equal(body.user.accountType, 'retail');
    retailToken = body.accessToken;
  });

  test('GET /me returns the signed-in account', async () => {
    const { status, body } = await api('GET', '/api/auth/me', { token: retailToken });
    assert.equal(status, 200);
    assert.equal(body.user.name, 'Lucia Fernanda Mora');
  });

  test('duplicate email returns 409 account_exists', async () => {
    const { status, body } = await api('POST', '/api/auth/register', {
      body: { name: 'Someone', email: 'lucia@example.com', password: 'longpassword1' },
    });
    assert.equal(status, 409);
    assert.equal(body.code, 'account_exists');
  });

  test('B2B registration requires company name and tax ID', async () => {
    const { status, body } = await api('POST', '/api/auth/register', {
      body: { name: 'Biz Owner', email: 'biz@example.com', password: 'longpassword1', accountType: 'b2b' },
    });
    assert.equal(status, 400);
    assert.deepEqual(fieldsIn(body), ['companyName', 'taxId']);
  });

  test('rejects short passwords and bad emails', async () => {
    const { status, body } = await api('POST', '/api/auth/register', {
      body: { name: 'X', email: 'not-an-email', password: 'short' },
    });
    assert.equal(status, 400);
    assert.deepEqual(fieldsIn(body), ['email', 'password']);
  });

  test('wrong password and unknown email both return invalid_credentials', async () => {
    const wrongPassword = await api('POST', '/api/auth/login', { body: { email: 'lucia@example.com', password: 'wrong-password' } });
    const unknownEmail = await api('POST', '/api/auth/login', { body: { email: 'nobody@example.com', password: 'whatever123' } });
    for (const result of [wrongPassword, unknownEmail]) {
      assert.equal(result.status, 401);
      assert.equal(result.body.code, 'invalid_credentials');
    }
  });

  test('seed accounts can log in with the demo password', async () => {
    assert.ok(await login('maria.garcia@example.com'));
    assert.ok(await login('ramon.torres@chocolatier.com'));
  });

  test('missing or invalid tokens are rejected', async () => {
    const missing = await api('GET', '/api/auth/me');
    assert.equal(missing.status, 401);
    assert.equal(missing.body.code, 'missing_access_token');

    const invalid = await api('GET', '/api/auth/me', { token: 'not.a.token' });
    assert.equal(invalid.status, 401);
    assert.equal(invalid.body.code, 'invalid_token');
  });

  test('PATCH /me updates name and email', async () => {
    const { status, body } = await api('PATCH', '/api/auth/me', {
      token: retailToken,
      body: { name: 'Lucia Mora', email: 'lucia.mora@example.com', companyName: 'ignored for retail' },
    });
    assert.equal(status, 200);
    assert.equal(body.user.name, 'Lucia Mora');
    assert.equal(body.user.email, 'lucia.mora@example.com');
    assert.equal(body.user.companyName, '');
  });

  test('PATCH /me refuses an email another account uses', async () => {
    const { status, body } = await api('PATCH', '/api/auth/me', {
      token: retailToken,
      body: { email: 'maria.garcia@example.com' },
    });
    assert.equal(status, 409);
    assert.equal(body.code, 'account_exists');
  });

  test('B2B accounts can update company details', async () => {
    const token = await login('ramon.torres@chocolatier.com');
    const { status, body } = await api('PATCH', '/api/auth/me', {
      token,
      body: { companyName: 'Chocolatier del Valle S.A.S.', taxId: 'CO-901234567' },
    });
    assert.equal(status, 200);
    assert.equal(body.user.companyName, 'Chocolatier del Valle S.A.S.');
  });
});

describe('cart', () => {
  let token;
  before(async () => { token = await login('maria.garcia@example.com'); });

  test('requires sign-in', async () => {
    const { status } = await api('POST', '/api/cart/sync', { body: [] });
    assert.equal(status, 401);
  });

  test('sync merges the browser cart into the account cart and skips unknown products', async () => {
    // Maria's Phase 1 seed cart already has SOL-70-EC x2 and SOL-85-PE x1.
    const { status, body } = await api('POST', '/api/cart/sync', {
      token,
      body: [{ productId: 'ESM-72', quantity: 2 }, { productId: 'demo-esmeraldas-72', quantity: 1 }],
    });
    assert.equal(status, 200);
    assert.deepEqual(body.skipped, ['demo-esmeraldas-72']);
    const quantities = Object.fromEntries(body.items.map(item => [item.productId, item.quantity]));
    assert.deepEqual(quantities, { 'SOL-70-EC': 2, 'SOL-85-PE': 1, 'ESM-72': 2 });
    assert.equal(body.items.find(item => item.productId === 'ESM-72').product.name.en, '72% Dark Esmeraldas');
  });

  test('syncing the same cart again does not double quantities', async () => {
    const { body } = await api('POST', '/api/cart/sync', {
      token,
      body: [{ productId: 'ESM-72', quantity: 1 }, { productId: 'SAM-85', quantity: 1 }],
    });
    const quantities = Object.fromEntries(body.items.map(item => [item.productId, item.quantity]));
    assert.equal(quantities['ESM-72'], 2);
    assert.equal(quantities['SAM-85'], 1);
  });

  test('persist replaces the account cart and keeps price snapshots', async () => {
    await pool.query("UPDATE product SET price = 20.00 WHERE sku = 'SAM-85'");
    try {
      const { status, body } = await api('POST', '/api/cart/persist', {
        token,
        body: [{ productId: 'SAM-85', quantity: 3 }, { productId: 'PIU-100', quantity: 1 }],
      });
      assert.equal(status, 200);
      const byId = Object.fromEntries(body.items.map(item => [item.productId, item]));
      assert.deepEqual(Object.keys(byId).sort(), ['PIU-100', 'SAM-85']);
      assert.equal(byId['SAM-85'].unitPrice, 12); // price when first added
      assert.equal(byId['SAM-85'].product.price, 20); // current catalog price
      assert.equal(byId['PIU-100'].unitPrice, 15);
      assert.equal(body.total, 51);
    } finally {
      await pool.query("UPDATE product SET price = 12.00 WHERE sku = 'SAM-85'");
    }
  });

  test('GET /api/cart returns the saved cart', async () => {
    const { body } = await api('GET', '/api/cart', { token });
    assert.equal(body.items.length, 2);
  });

  test('rejects invalid quantities', async () => {
    const { status, body } = await api('POST', '/api/cart/sync', {
      token,
      body: [{ productId: 'ESM-72', quantity: 0 }, { productId: 'ESM-72', quantity: 1.5 }],
    });
    assert.equal(status, 400);
    assert.equal(body.details.length, 2);
  });

  test('rejects a body that is not an array', async () => {
    const { status } = await api('POST', '/api/cart/sync', { token, body: { productId: 'ESM-72' } });
    assert.equal(status, 400);
  });
});

describe('B2B quotes', () => {
  let b2bToken;
  let retailToken;
  before(async () => {
    b2bToken = await login('ramon.torres@chocolatier.com');
    retailToken = await login('maria.garcia@example.com');
  });

  test('requires sign-in', async () => {
    const { status } = await api('POST', '/api/b2b/quote', { form: quoteForm() });
    assert.equal(status, 401);
  });

  test('retail accounts get 403', async () => {
    const { status, body } = await api('POST', '/api/b2b/quote', { token: retailToken, form: quoteForm() });
    assert.equal(status, 403);
    assert.equal(body.code, 'b2b_account_required');
  });

  test('creates a quote with a PDF tech pack', async () => {
    const { status, body } = await api('POST', '/api/b2b/quote', {
      token: b2bToken,
      form: quoteForm({}, { name: 'Brand Logo.PDF', content: PDF_BYTES }),
    });
    assert.equal(status, 201);
    assert.equal(body.status, 'pending');

    const [[row]] = await pool.query('SELECT * FROM b2b_quote_request WHERE quote_id = ?', [body.quoteId]);
    assert.equal(row.user_id, 2);
    assert.equal(row.company_name, 'Chocolatier del Valle S.A.S.');
    assert.equal(row.origin, 'Esmeraldas, Ecuador');
    assert.equal(row.target_percentage, 75);
    assert.equal(row.roast, 'medium');
    assert.equal(row.mold_required, 1);
    assert.equal(row.packaging_tier, 'premium');
    assert.equal(row.estimated_units, 500);
    assert.equal(row.vector_original_name, 'Brand Logo.PDF');
    const storedName = path.basename(row.vector_logo_url);
    assert.match(storedName, /\.pdf$/);
    assert.ok((await uploadedFiles()).includes(storedName));
  });

  test('the tech pack is optional, and SVG files are accepted', async () => {
    const withoutFile = await api('POST', '/api/b2b/quote', { token: b2bToken, form: quoteForm({ packagingTier: 'Standard Kraft' }) });
    assert.equal(withoutFile.status, 201);

    const svg = '<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';
    const withSvg = await api('POST', '/api/b2b/quote', {
      token: b2bToken,
      form: quoteForm({ packagingTier: 'Custom Foil Stamped', moldRequired: 'false' }, { name: 'logo.svg', content: svg }),
    });
    assert.equal(withSvg.status, 201);
  });

  test('rejects file types other than AI, PDF, SVG and EPS', async () => {
    const before = await uploadedFiles();
    const { status, body } = await api('POST', '/api/b2b/quote', {
      token: b2bToken,
      form: quoteForm({}, { name: 'logo.png', content: 'png bytes' }),
    });
    assert.equal(status, 400);
    assert.equal(body.code, 'invalid_file_type');
    assert.deepEqual(await uploadedFiles(), before);
  });

  test('rejects a file whose content does not match its extension', async () => {
    const before = await uploadedFiles();
    const { status, body } = await api('POST', '/api/b2b/quote', {
      token: b2bToken,
      form: quoteForm({}, { name: 'fake.pdf', content: '<html>not a pdf</html>' }),
    });
    assert.equal(status, 400);
    assert.equal(body.code, 'invalid_file_content');
    assert.deepEqual(await uploadedFiles(), before);
  });

  test('rejects files over 10 MB with 413', async () => {
    const before = await uploadedFiles();
    const big = new Uint8Array(10 * 1024 * 1024 + 1);
    big.set(new TextEncoder().encode('%PDF-1.4'));
    const { status, body } = await api('POST', '/api/b2b/quote', {
      token: b2bToken,
      form: quoteForm({}, { name: 'huge.pdf', content: big }),
    });
    assert.equal(status, 413);
    assert.equal(body.code, 'file_too_large');
    assert.deepEqual(await uploadedFiles(), before);
  });

  test('invalid fields return 400 and the uploaded file is deleted', async () => {
    const before = await uploadedFiles();
    const { status, body } = await api('POST', '/api/b2b/quote', {
      token: b2bToken,
      form: quoteForm(
        { targetPercentage: '150', estimatedUnits: '2.5', roast: 'burnt', origin: 'Atlantis', packagingTier: undefined },
        { name: 'ok.pdf', content: PDF_BYTES },
      ),
    });
    assert.equal(status, 400);
    assert.deepEqual(fieldsIn(body), ['estimatedUnits', 'origin', 'packagingTier', 'roast', 'targetPercentage']);
    assert.deepEqual(await uploadedFiles(), before);
  });

  test('GET /api/b2b/quotes lists the company\'s own quotes', async () => {
    const { status, body } = await api('GET', '/api/b2b/quotes', { token: b2bToken });
    assert.equal(status, 200);
    // 1 from the Phase 1 seed + 3 created above
    assert.equal(body.quotes.length, 4);
    assert.ok(body.quotes.some(quote => quote.brandVectorFileName === 'logo.svg'));
  });
});

describe('inquiries', () => {
  const countRows = async table => (await pool.query(`SELECT COUNT(*) AS n FROM ${table}`))[0][0].n;
  const sampler = (overrides = {}) => ({
    name: 'Ana Ruiz',
    email: 'ana@example.com',
    category: 'sampler',
    message: 'I would like to try these before a wholesale order.',
    samplerSelections: ['ESM-72', 'SAM-85'],
    ...overrides,
  });

  test('saves a sampler inquiry with its selected products in order', async () => {
    const { status, body } = await api('POST', '/api/inquiries', { body: sampler({ samplerSelections: ['SAM-85', 'ESM-72', 'SAM-85'] }) });
    assert.equal(status, 201);
    assert.equal(body.status, 'received');

    const [slots] = await pool.query(
      'SELECT slot_number, sku FROM inquiry_sampler_selection WHERE inquiry_id = ? ORDER BY slot_number',
      [body.inquiryId],
    );
    assert.deepEqual(slots.map(slot => [slot.slot_number, slot.sku]), [[1, 'SAM-85'], [2, 'ESM-72'], [3, 'SAM-85']]);
  });

  test('links the inquiry to the account when a token is sent', async () => {
    const token = await login('maria.garcia@example.com');
    const { body } = await api('POST', '/api/inquiries', { token, body: sampler() });
    const [[row]] = await pool.query('SELECT user_id, message FROM inquiry WHERE inquiry_id = ?', [body.inquiryId]);
    assert.equal(row.user_id, 1);
  });

  test('rejects products that are not sampler-eligible and saves nothing', async () => {
    const inquiriesBefore = await countRows('inquiry');
    const { status, body } = await api('POST', '/api/inquiries', { body: sampler({ samplerSelections: ['ESM-72', 'PIU-NIB-55', 'NOPE'] }) });
    assert.equal(status, 400);
    assert.match(body.details[0].message, /PIU-NIB-55, NOPE/);
    assert.equal(await countRows('inquiry'), inquiriesBefore);
  });

  test('sampler inquiries need 1 to 4 selections', async () => {
    for (const samplerSelections of [undefined, [], ['ESM-72', 'ESM-72', 'ESM-72', 'ESM-72', 'ESM-72'], [42]]) {
      const { status, body } = await api('POST', '/api/inquiries', { body: sampler({ samplerSelections }) });
      assert.equal(status, 400);
      assert.deepEqual(fieldsIn(body), ['samplerSelections']);
    }
  });

  test('other categories must not send samplerSelections', async () => {
    const { status, body } = await api('POST', '/api/inquiries', { body: sampler({ category: 'wholesale' }) });
    assert.equal(status, 400);
    assert.deepEqual(fieldsIn(body), ['samplerSelections']);
  });

  test('saves wholesale, gifts and support inquiries', async () => {
    for (const category of ['wholesale', 'gifts', 'support']) {
      const { status } = await api('POST', '/api/inquiries', { body: sampler({ category, samplerSelections: undefined }) });
      assert.equal(status, 201);
    }
  });

  test('message must be 10 to 5000 characters after trimming', async () => {
    for (const message of ['  too short  ', '          ', 'x'.repeat(5001)]) {
      const { status, body } = await api('POST', '/api/inquiries', { body: sampler({ message }) });
      assert.equal(status, 400);
      assert.deepEqual(fieldsIn(body), ['message']);
    }
  });

  test('validates name, email and category together', async () => {
    const { status, body } = await api('POST', '/api/inquiries', {
      body: { name: '', email: 'nope', category: 'spam', message: 'Hello there, this is long enough.' },
    });
    assert.equal(status, 400);
    assert.deepEqual(fieldsIn(body), ['category', 'email', 'name']);
  });
});

describe('localization', () => {
  test('lists the languages', async () => {
    const { body } = await api('GET', '/api/localization');
    assert.deepEqual(body.languages.map(language => language.code), ['en', 'es']);
  });

  test('returns the Spanish dictionary with the frontend keys', async () => {
    const { status, body } = await api('GET', '/api/localization/es');
    assert.equal(status, 200);
    assert.equal(body.translations.navContact, 'Contacto');
    assert.equal(body.translations.slot, 'Espacio {number}');
    assert.ok(Object.keys(body.translations).length >= 206);
  });

  test('unknown languages return 404', async () => {
    const { status, body } = await api('GET', '/api/localization/fr');
    assert.equal(status, 404);
    assert.equal(body.code, 'language_not_found');
  });
});

describe('reports', () => {
  const admin = { 'X-Admin-Key': 'test-admin-key' };

  test('require the admin key', async () => {
    const { status, body } = await api('GET', '/api/reports/low-stock', { headers: { 'X-Admin-Key': 'wrong' } });
    assert.equal(status, 401);
    assert.equal(body.code, 'invalid_admin_key');
  });

  test('low-stock report uses v_low_stock', async () => {
    const { body } = await api('GET', '/api/reports/low-stock', { headers: admin });
    assert.deepEqual(body.items.map(item => item.sku).sort(), ['PIU-NIB-55', 'SOL-60-MX', 'SOL-85-PE']);
  });

  test('quote report groups by status', async () => {
    const { body } = await api('GET', '/api/reports/quotes', { headers: admin });
    assert.equal(body.total, 5); // 2 seed + 3 from the tests
    assert.equal(body.byStatus.find(row => row.status === 'pending').count, 4);
  });

  test('inquiry report includes sampler favorites', async () => {
    const { body } = await api('GET', '/api/reports/inquiries', { headers: admin });
    assert.equal(body.samplerFavorites[0].sku, 'SAM-85');
    assert.ok(body.byCategory.some(row => row.category === 'sampler'));
  });

  test('cart report uses v_cart_total for active carts', async () => {
    const { body } = await api('GET', '/api/reports/carts', { headers: admin });
    assert.ok(body.activeCarts >= 2);
    assert.equal(typeof body.totalValue, 'number');
  });
});
