const { EmbedBuilder } = require('discord.js');

const PAGE_SIZE = 10;

// Restrained, "premium" palette — not neon, not default-Discord-blurple.
const COLORS = {
  silver: 0x8b95a1, // muted steel grey
  gold: 0xb08d2f,   // muted antique gold
};

function fmtMoney(n) {
  return n.toLocaleString('en-US');
}

function fmtPlaytime(seconds) {
  const hours = Math.floor(seconds / 3600);
  return hours.toLocaleString('en-US') + 'h';
}

function country(short) {
  return short ? `[${short}]` : '[--]';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function pad(str, len) {
  return truncate(str, len).padEnd(len, ' ');
}

function padNum(str, len) {
  return truncate(String(str), len).padStart(len, ' ');
}

function paginate(list, page) {
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const slice = list.slice(start, start + PAGE_SIZE);
  return { slice, safePage, totalPages, start };
}

function baseEmbed(server, title) {
  return new EmbedBuilder()
    .setColor(COLORS[server])
    .setAuthor({ name: 'Pokemon Revolution Online' })
    .setTitle(title)
    .setFooter({ text: `${server.toUpperCase()} SERVER` })
    .setTimestamp();
}

function table(rows) {
  return '```\n' + rows.join('\n') + '\n```';
}

function rankedEmbed(server, data, page = 0) {
  const { slice, safePage, totalPages, start } = paginate(data.rankedLadder, page);
  const embed = baseEmbed(server, 'PvP Ranked Ladder');

  const header = `${pad('#', 3)} ${pad('PLAYER', 16)} ${pad('GUILD', 14)} ${padNum('RATING', 7)} ${padNum('W-L', 9)}`;
  const rows = slice.map((p, i) => {
    const rank = start + i + 1;
    return `${padNum(rank, 3)} ${pad(p.username, 16)} ${pad(p.guild?.name ?? '-', 14)} ${padNum(p.PVP.rankedRating, 7)} ${padNum(`${p.PVP.rankedWins}-${p.PVP.rankedLosses}`, 9)}`;
  });

  embed.addFields({ name: '\u200b', value: table([header, ...rows]) });
  if (slice[0]?.characterUrl) embed.setThumbnail(slice[0].characterUrl);
  embed.setFooter({ text: `${server.toUpperCase()} SERVER  •  Page ${safePage + 1} of ${totalPages}` });
  return embed;
}

function randomEmbed(server, data, page = 0) {
  const { slice, safePage, totalPages, start } = paginate(data.randomLadder, page);
  const embed = baseEmbed(server, 'Random Battle Ladder');

  const header = `${pad('#', 3)} ${pad('PLAYER', 16)} ${pad('GUILD', 14)} ${padNum('SCORE', 6)} ${padNum('W-L', 9)}`;
  const rows = slice.map((p, i) => {
    const rank = start + i + 1;
    return `${padNum(rank, 3)} ${pad(p.username, 16)} ${pad(p.guild?.name ?? '-', 14)} ${padNum(p.PVP.randomBattleScore, 6)} ${padNum(`${p.PVP.randomBattleWins}-${p.PVP.randomBattleLosses}`, 9)}`;
  });

  embed.addFields({ name: '\u200b', value: table([header, ...rows]) });
  if (slice[0]?.characterUrl) embed.setThumbnail(slice[0].characterUrl);
  embed.setFooter({ text: `${server.toUpperCase()} SERVER  •  Page ${safePage + 1} of ${totalPages}` });
  return embed;
}

function moneyEmbed(server, data, page = 0) {
  const { slice, safePage, totalPages, start } = paginate(data.moneyLadder, page);
  const embed = baseEmbed(server, 'Richest Players');

  const header = `${pad('#', 3)} ${pad('PLAYER', 16)} ${pad('GUILD', 12)} ${padNum('MONEY', 14)} ${padNum('PLAYTIME', 9)}`;
  const rows = slice.map((p, i) => {
    const rank = start + i + 1;
    return `${padNum(rank, 3)} ${pad(p.username, 16)} ${pad(p.guild?.name ?? '-', 12)} ${padNum(fmtMoney(p.money), 14)} ${padNum(fmtPlaytime(p.playtime), 9)}`;
  });

  embed.addFields({ name: '\u200b', value: table([header, ...rows]) });
  if (slice[0]?.characterUrl) embed.setThumbnail(slice[0].characterUrl);
  embed.setFooter({ text: `${server.toUpperCase()} SERVER  •  Page ${safePage + 1} of ${totalPages}` });
  return embed;
}

function guildEmbed(server, data, page = 0) {
  const { slice, safePage, totalPages, start } = paginate(data.guildLadder, page);
  const embed = baseEmbed(server, 'Top PvP Guilds');

  const header = `${pad('#', 3)} ${pad('GUILD', 18)} ${padNum('RATING', 7)} ${pad('LEADER', 16)}`;
  const rows = slice.map((g, i) => {
    const rank = start + i + 1;
    return `${padNum(rank, 3)} ${pad(g.name, 18)} ${padNum(g.pvpRating, 7)} ${pad(g.leader?.username ?? '-', 16)}`;
  });

  embed.addFields({ name: '\u200b', value: table([header, ...rows]) });
  if (slice[0]?.leader?.characterUrl) embed.setThumbnail(slice[0].leader.characterUrl);
  embed.setFooter({ text: `${server.toUpperCase()} SERVER  •  Page ${safePage + 1} of ${totalPages}` });
  return embed;
}

function playtimeEmbed(server, data, page = 0) {
  const { slice, safePage, totalPages, start } = paginate(data.playtimeLadder, page);
  const embed = baseEmbed(server, 'Most Time Ingame');

  const header = `${pad('#', 3)} ${pad('PLAYER', 16)} ${pad('GUILD', 14)} ${padNum('PLAYTIME', 9)}`;
  const rows = slice.map((p, i) => {
    const rank = start + i + 1;
    return `${padNum(rank, 3)} ${pad(p.username, 16)} ${pad(p.guild?.name ?? '-', 14)} ${padNum(fmtPlaytime(p.playtime), 9)}`;
  });

  embed.addFields({ name: '\u200b', value: table([header, ...rows]) });
  if (slice[0]?.characterUrl) embed.setThumbnail(slice[0].characterUrl);
  embed.setFooter({ text: `${server.toUpperCase()} SERVER  •  Page ${safePage + 1} of ${totalPages}` });
  return embed;
}

function countriesEmbed(server, data) {
  const embed = baseEmbed(server, 'Players by Country');

  const header = `${pad('#', 3)} ${pad('COUNTRY', 22)} ${padNum('SHARE', 7)}`;
  const rows = data.countriesLadder.map((c, i) => {
    return `${padNum(i + 1, 3)} ${pad(`${country(c.country.countryShort)} ${c.country.countryLong}`, 22)} ${padNum(c.percentage.toFixed(2) + '%', 7)}`;
  });

  embed.addFields({ name: '\u200b', value: table([header, ...rows]) });
  return embed;
}

const BUILDERS = {
  pvp: rankedEmbed,
  random: randomEmbed,
  money: moneyEmbed,
  guild: guildEmbed,
  playtime: playtimeEmbed,
  countries: countriesEmbed,
};

function getListLength(type, data) {
  switch (type) {
    case 'pvp': return data.rankedLadder.length;
    case 'random': return data.randomLadder.length;
    case 'money': return data.moneyLadder.length;
    case 'guild': return data.guildLadder.length;
    case 'playtime': return data.playtimeLadder.length;
    default: return 0;
  }
}

module.exports = { BUILDERS, getListLength, PAGE_SIZE };
