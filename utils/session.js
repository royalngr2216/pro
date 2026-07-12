const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

const ROOT_URL = 'https://pokemonrevolution.net';
const DASHBOARD_URL = 'https://dashboard.pokemonrevolution.net';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BROWSER_HEADERS = {
  'User-Agent': UA,
  'Accept': '*/*',
  'Accept-Language': 'en',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Not;A=Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'Origin': DASHBOARD_URL,
  'Referer': `${DASHBOARD_URL}/dashboard`,
};

const jar = new CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    timeout: 15000,
    headers: BROWSER_HEADERS,
  })
);

let csrfToken = null;

async function dumpAllCookies(label) {
  const rootCookies = await jar.getCookies(ROOT_URL);
  const dashCookies = await jar.getCookies(DASHBOARD_URL);
  const all = [...rootCookies, ...dashCookies];
  const names = all.map((c) => `${c.key}=${c.value.slice(0, 12)}...`);
  console.log(`[session] cookies in jar after ${label}:`, names.length ? names.join(', ') : '(none)');
}

async function refreshCsrfFromJar() {
  const rootCookies = await jar.getCookies(ROOT_URL);
  const dashCookies = await jar.getCookies(DASHBOARD_URL);
  const all = [...rootCookies, ...dashCookies];
  // Try a few likely cookie names, not just the exact one we saw once.
  const found = all.find((c) =>
    ['csrf', 'csrf_token', 'csrftoken', 'xsrf-token', '_csrf'].includes(c.key.toLowerCase())
  );
  csrfToken = found ? found.value : null;
}

// GraphQL servers mostly respond to POST, but CSRF-issuing middleware often
// runs on GET too (and sometimes ONLY on GET, since POST is treated as an
// "unsafe" method that requires a token to already exist). We try several
// approaches and log everything so we can see exactly what sets what.
async function warmup() {
  try {
    const r1 = await client.get(`${ROOT_URL}/graphql`);
    console.log('[session] GET root/graphql status:', r1.status, 'raw set-cookie:', r1.headers['set-cookie']);
  } catch (err) {
    console.log('[session] GET root/graphql errored:', err.message, err.response?.status, 'raw set-cookie:', err.response?.headers?.['set-cookie']);
  }
  await dumpAllCookies('GET root/graphql');

  try {
    const r2 = await client.get(`${DASHBOARD_URL}/dashboard`);
    console.log('[session] GET dashboard/dashboard status:', r2.status, 'raw set-cookie:', r2.headers['set-cookie']);
  } catch (err) {
    console.log('[session] GET dashboard/dashboard errored:', err.message, err.response?.status, 'raw set-cookie:', err.response?.headers?.['set-cookie']);
  }
  await dumpAllCookies('GET dashboard/dashboard');

  try {
    const r3 = await client.post(
      `${ROOT_URL}/graphql`,
      { query: '{ __typename }', variables: {} },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('[session] POST root/graphql status:', r3.status, 'raw set-cookie:', r3.headers['set-cookie']);
  } catch (err) {
    console.log('[session] POST root/graphql errored:', err.message, err.response?.status, 'raw set-cookie:', err.response?.headers?.['set-cookie']);
  }
  await dumpAllCookies('POST root/graphql');

  await refreshCsrfFromJar();
  console.log('[session] csrf token after warmup:', csrfToken ? 'FOUND' : 'MISSING');
}

async function login() {
  const username = process.env.PRO_USERNAME;
  const password = process.env.PRO_PASSWORD;

  if (!username || !password) {
    throw new Error('PRO_USERNAME / PRO_PASSWORD environment variables are not set.');
  }

  await warmup();

  const loginQuery = `mutation Login($name: String!, $password: String!) {\n  login(name: $name, password: $password)\n}`;

  const headers = { 'Content-Type': 'application/json' };
  if (csrfToken) headers['X-Csrf-Token'] = csrfToken;

  const response = await client.post(
    `${ROOT_URL}/graphql`,
    { query: loginQuery, variables: { name: username, password } },
    { headers }
  );

  console.log('[session] login response status:', response.status, 'has errors:', !!response.data.errors);

  if (response.data.errors) {
    throw new Error('PRO login failed: ' + JSON.stringify(response.data.errors));
  }

  await refreshCsrfFromJar();
  console.log('[session] login succeeded, csrf token now:', getCsrfToken() ? 'SET' : 'STILL MISSING');
  return true;
}

function getCsrfToken() {
  return csrfToken;
}

module.exports = { client, login, getCsrfToken, DASHBOARD_URL };
