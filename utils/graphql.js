const { client, login, getCsrfToken, DASHBOARD_URL } = require('./session');

const GRAPHQL_URL = `${DASHBOARD_URL}/graphql`;

const QUERY = `
{
  silver: toplists(server: silver) {
    rankedLadder {
      username
      characterUrl(scale: 2)
      PVP {
        rankedRating
        rankedWins
        rankedLosses
      }
      guild { name }
      lastLocation { countryShort countryLong }
    }
    randomLadder {
      username
      characterUrl(scale: 2)
      PVP {
        randomBattleScore
        randomBattleWins
        randomBattleLosses
      }
      guild { name }
      lastLocation { countryShort countryLong }
    }
    moneyLadder {
      username
      characterUrl(scale: 2)
      money
      playtime
      guild { name }
      lastLocation { countryShort countryLong }
    }
    guildLadder {
      name
      pvpRating
      leader {
        username
        characterUrl(scale: 2)
      }
    }
    playtimeLadder {
      username
      characterUrl(scale: 2)
      guild { name }
      lastLocation { countryShort countryLong }
      registration
      playtime
    }
    countriesLadder {
      percentage
      country { countryShort countryLong }
    }
  }
  gold: toplists(server: gold) {
    rankedLadder {
      username
      characterUrl(scale: 2)
      PVP {
        rankedRating
        rankedWins
        rankedLosses
      }
      guild { name }
      lastLocation { countryShort countryLong }
    }
    randomLadder {
      username
      characterUrl(scale: 2)
      PVP {
        randomBattleScore
        randomBattleWins
        randomBattleLosses
      }
      guild { name }
      lastLocation { countryShort countryLong }
    }
    moneyLadder {
      username
      characterUrl(scale: 2)
      money
      playtime
      guild { name }
      lastLocation { countryShort countryLong }
    }
    guildLadder {
      name
      pvpRating
      leader {
        username
        characterUrl(scale: 2)
      }
    }
    playtimeLadder {
      username
      characterUrl(scale: 2)
      guild { name }
      lastLocation { countryShort countryLong }
      registration
      playtime
    }
    countriesLadder {
      percentage
      country { countryShort countryLong }
    }
  }
}`;

let cache = { data: null, lastFetched: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let loggedIn = false;

function isAuthError(errors) {
  return Array.isArray(errors) && errors.some((e) => /authentication/i.test(e.message || ''));
}

async function doFetch() {
  const headers = { 'Content-Type': 'application/json' };
  const csrf = getCsrfToken();
  if (csrf) headers['X-Csrf-Token'] = csrf;

  const response = await client.post(
    GRAPHQL_URL,
    { query: QUERY, variables: {} },
    { headers }
  );

  if (response.data.errors) {
    if (isAuthError(response.data.errors)) {
      const err = new Error('AUTH_REQUIRED');
      err.isAuthError = true;
      throw err;
    }
    throw new Error('GraphQL error: ' + JSON.stringify(response.data.errors));
  }

  return response.data.data;
}

async function fetchToplists(force = false) {
  const now = Date.now();

  if (!force && cache.data && now - cache.lastFetched < CACHE_TTL_MS) {
    return cache.data;
  }

  if (!loggedIn) {
    await login();
    loggedIn = true;
  }

  try {
    const data = await doFetch();
    cache.data = data;
    cache.lastFetched = now;
    return data;
  } catch (err) {
    if (err.isAuthError) {
      // Session expired mid-run — relogin once and retry before giving up.
      await login();
      const data = await doFetch();
      cache.data = data;
      cache.lastFetched = now;
      return data;
    }
    throw err;
  }
}

function getCacheAge() {
  if (!cache.lastFetched) return null;
  return Date.now() - cache.lastFetched;
}

module.exports = { fetchToplists, getCacheAge };
