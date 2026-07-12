const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

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
  // The csrf cookie's Domain is the apex (pokemonrevolution.net), so it's
  // visible from either host — but check both in case that ever changes.
  const rootCookies = await jar.getCookies(ROOT_URL);
  const dashCookies = await jar.getCookies(DASHBOARD_URL);
  const found = [...rootCookies, ...dashCookies].find((c) => c.key === 'csrf');
  csrfToken = found ? found.value : null;
}

// GraphQL servers only respond meaningfully to POST, so we can't warm up
// cookies with a plain GET to a page. Instead we send a harmless
// introspection-style query to the real endpoint — the server sets its
// csrf/session cookies on this response regardless of whether the query
// itself succeeds.
async function warmup() {
  try {
    const res = await client.post(
      `${ROOT_URL}/graphql`,
      { query: '{ __typename }', variables: {} },
      { headers: { 'Content-Type': 'application/json' } }
    );
    console.log('[session] warmup status:', res.status);
  } catch (err) {
    console.log('[session] warmup request errored (expected, checking cookies anyway):', err.message);
  }
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
