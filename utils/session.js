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

async function findFirst(page, selectors) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) return { el, sel };
  }
  return null;
}

async function findButtonByText(page, patterns) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText || el.textContent || '', btn);
    if (patterns.some((p) => p.test(text))) return btn;
  }
  return null;
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

    await page.waitForSelector('input', { timeout: 10000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));

    const usernameField = await findFirst(page, [
      'input[name="name"]',
      'input[name="username"]',
      'input[type="email"]',
      'input[type="text"]',
    ]);
    const passwordField = await findFirst(page, ['input[type="password"]']);

    if (!usernameField || !passwordField) {
      const allInputs = await page.$$eval('input', (els) =>
        els.map((e) => ({ type: e.type, name: e.name, id: e.id }))
      );
      console.log('[session] could not find form fields. Inputs on page:', JSON.stringify(allInputs));
      throw new Error('Could not locate username/password fields on the login page.');
    }

    console.log('[session] found username field via', usernameField.sel, '- typing credentials...');
    await usernameField.el.click({ clickCount: 3 });
    await usernameField.el.type(username, { delay: 30 });
    await passwordField.el.click({ clickCount: 3 });
    await passwordField.el.type(password, { delay: 30 });

    let submitButton = await page.$('button[type="submit"]');
    if (!submitButton) {
      submitButton = await findButtonByText(page, [/log\s*in/i, /sign\s*in/i]);
    }

    if (!submitButton) {
      const allButtons = await page.$$eval('button', (els) => els.map((e) => e.innerText || e.textContent));
      console.log('[session] could not find submit button. Buttons on page:', JSON.stringify(allButtons));
      throw new Error('Could not locate the submit button on the login page.');
    }

    console.log('[session] clicking submit and waiting for the login network response...');
    const [loginResponse] = await Promise.all([
      page
        .waitForResponse(
          (res) =>
            res.url().includes('/graphql') &&
            (res.request().postData() || '').toLowerCase().includes('login'),
          { timeout: 20000 }
        )
        .catch(() => null),
      submitButton.click(),
    ]);

    if (!loginResponse) {
      throw new Error('Did not observe a login network response within 20s after clicking submit.');
    }

    const loginResult = await loginResponse.json().catch(() => ({}));
    console.log(
      '[session] login form response status:',
      loginResponse.status(),
      'has errors:',
      !!loginResult.errors
    );

    if (loginResult.errors) {
      throw new Error('PRO login failed: ' + JSON.stringify(loginResult.errors));
    }

    // Give any post-login redirect/cookie-setting a brief moment to settle.
    await new Promise((r) => setTimeout(r, 1000));

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
