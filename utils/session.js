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
  const cookies = await jar.getCookies(DASHBOARD_URL);
  const csrfCookie = cookies.find((c) => c.key === 'csrf');
  csrfToken = csrfCookie ? csrfCookie.value : null;
}

// Hits the dashboard once before logging in — some CSRF-protected APIs
// require the csrf cookie to already exist before you can log in at all.
async function warmup() {
  try {
    await client.get(`${DASHBOARD_URL}/dashboard`);
  } catch (err) {
    // The SPA route may not return a clean 200 without JS, that's fine —
    // we only care about cookies being set on the response.
  }
  await refreshCsrfFromJar();
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

  if (response.data.errors) {
    throw new Error('PRO login failed: ' + JSON.stringify(response.data.errors));
  }

  await refreshCsrfFromJar();
  return true;
}

function getCsrfToken() {
  return csrfToken;
}

module.exports = { client, login, getCsrfToken, DASHBOARD_URL };
