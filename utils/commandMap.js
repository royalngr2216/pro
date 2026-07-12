// Maps every command/alias to a canonical leaderboard "type" understood
// by utils/embeds.js. Add new aliases here — nothing else needs to change.
const COMMAND_MAP = {
  ladder: 'pvp',
  l: 'pvp',

  guildladder: 'guild',
  gl: 'guild',

  moneyladder: 'money',
  money: 'money',

  randomladder: 'random',
  rl: 'random',

  playtime: 'playtime',
  pt: 'playtime',

  countries: 'countries',
  c: 'countries',
};

const TYPE_LABELS = {
  pvp: 'PvP Ranked Ladder',
  guild: 'Guild Ladder',
  money: 'Money Ladder',
  random: 'Random Battle Ladder',
  playtime: 'Playtime Ladder',
  countries: 'Country Distribution',
};

const HELP_ENTRIES = [
  { cmd: '^ladder <gold|silver>', alias: '^l', desc: 'PvP ranked ladder' },
  { cmd: '^guildladder <gold|silver>', alias: '^gl', desc: 'Top PvP guilds' },
  { cmd: '^moneyladder <gold|silver>', alias: '^money', desc: 'Richest players' },
  { cmd: '^randomladder <gold|silver>', alias: '^rl', desc: 'Random battle ladder' },
  { cmd: '^playtime <gold|silver>', alias: '^pt', desc: 'Most time ingame' },
  { cmd: '^countries <gold|silver>', alias: '^c', desc: 'Players by country' },
];

module.exports = { COMMAND_MAP, TYPE_LABELS, HELP_ENTRIES };
