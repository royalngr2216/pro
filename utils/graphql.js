const axios = require('axios');

const GRAPHQL_URL = 'https://dashboard.pokemonrevolution.net/graphql';

// The exact query captured from the dashboard's own network tab.
// Both servers are fetched in ONE request via GraphQL aliases (silver / gold).
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

// In-memory cache so we don't hammer the API on every single Discord command
let cache = {
  data: null,
  lastFetched: 0,
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchToplists(force = false) {
  const now = Date.now();

  if (!force && cache.data && now - cache.lastFetched < CACHE_TTL_MS) {
    return cache.data;
  }

  const response = await axios.post(
    GRAPHQL_URL,
    { query: QUERY, variables: {} },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    }
  );

  if (response.data.errors) {
    throw new Error(
      'GraphQL error: ' + JSON.stringify(response.data.errors)
    );
  }

  cache.data = response.data.data;
  cache.lastFetched = now;
  return cache.data;
}

function getCacheAge() {
  if (!cache.lastFetched) return null;
  return Date.now() - cache.lastFetched;
}

module.exports = { fetchToplists, getCacheAge };
