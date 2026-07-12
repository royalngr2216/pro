const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const puppeteer = require('puppeteer');

const ROOT_URL = 'https://pokemonrevolution.net';
const DASHBOARD_URL = 'https://dashboard.pokemonrevolution.net';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const jar = new CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    timeout: 15000,
    headers: { 'User-Agent': UA },
  })
);

let csrfToken = null;

async function refreshCsrfFromJar() {
  const rootCookies = await jar.getCookies(ROOT_URL);
  const dashCookies = await jar.getCookies(DASHBOARD_URL);
  const all = [...rootCookies, ...dashCookies];
  const found = all.find((c) =>
    ['csrf', 'csrf_token', 'csrftoken', 'xsrf-token', '_csrf'].includes(c.key.toLowerCase())
  );
  csrfToken = found ? found.value : null;
}

// Imports every cookie Puppeteer's real browser session picked up into our
// lightweight axios cookie jar, so all future polling requests can reuse a
// Cloudflare-trusted session without needing to launch a browser again.
async function importCookiesFromPage(page) {
  const cookies = await page.cookies(ROOT_URL, DASHBOARD_URL);
  console.log(
    '[session] importing',
    cookies.length,
    'cookies from browser session:',
    cookies.map((c) => c.name).join(', ') || '(none)'
  );

  for (const c of cookies) {
    const domain = c.domain.replace(/^\./, '');
    const url = `https://${domain}${c.path || '/'}`;
    const cookieStr = `${c.name}=${c.value}; Domain=${c.domain}; Path=${c.path || '/'}${
      c.secure ? '; Secure' : ''
    }`;
    try {
      await jar.setCookie(cookieStr, url);
    } catch (err) {
      console.log('[session] failed to import cookie', c.name, '-', err.message);
    }
  }
}

async function login() {
  const username = process.env.PRO_USERNAME;
  const password = process.env.PRO_PASSWORD;

  if (!username || !password) {
    throw new Error('PRO_USERNAME / PRO_PASSWORD environment variables are not set.');
  }

  console.log('[session] launching headless browser for login...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(UA);

    console.log('[session] navigating to login page...');
    await page.goto(`${DASHBOARD_URL}/auth/login`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Give the app's own bootstrap JS a moment to finish anything it does
    // asynchronously after networkidle2 (e.g. fetching a csrf token as part
    // of mounting the login form).
    await page.waitForSelector('input', { timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1500));

    const visibleCookies = await page.evaluate(() => document.cookie);
    console.log('[session] document.cookie after login page load:', visibleCookies || '(empty)');

    const jarCookiesNow = await page.cookies(ROOT_URL, DASHBOARD_URL);
    console.log(
      '[session] all cookies (incl httpOnly) after login page load:',
      jarCookiesNow.map((c) => c.name).join(', ') || '(none)'
    );

    console.log('[session] running login mutation inside the real browser context...');
    const result = await page.evaluate(
      async (rootUrl, name, password) => {
        const query =
          'mutation Login($name: String!, $password: String!) {\n  login(name: $name, password: $password)\n}';
        const res = await fetch(`${rootUrl}/graphql`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ query, variables: { name, password } }),
        });
        const body = await res.json();
        return { status: res.status, body };
      },
      ROOT_URL,
      username,
      password
    );

    console.log(
      '[session] login mutation status:',
      result.status,
      'has errors:',
      !!result.body.errors
    );

    if (result.body.errors) {
      throw new Error('PRO login failed: ' + JSON.stringify(result.body.errors));
    }

    await importCookiesFromPage(page);
    await refreshCsrfFromJar();
    console.log('[session] login complete, csrf token:', csrfToken ? 'SET' : 'MISSING');

    return true;
  } finally {
    await browser.close();
  }
}

function getCsrfToken() {
  return csrfToken;
}

module.exports = { client, login, getCsrfToken, DASHBOARD_URL };
