require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const express = require('express');

const { fetchToplists } = require('./utils/graphql');
const { BUILDERS, getListLength } = require('./utils/embeds');
const { COMMAND_MAP, TYPE_LABELS } = require('./utils/commandMap');
const { helpEmbed } = require('./utils/help');

const PREFIX = '^';
const VALID_SERVERS = ['gold', 'silver'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function buildRow(server, type, page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`lb:${server}:${type}:${page - 1}`)
      .setLabel('Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 0),
    new ButtonBuilder()
      .setCustomId(`lb:${server}:${type}:${page + 1}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages - 1)
  );
}

async function sendLeaderboard(message, type, server) {
  let toplists;
  try {
    toplists = await fetchToplists();
  } catch (err) {
    console.error('Failed to fetch toplists:', err.message);
    await message.reply('Could not reach the PRO dashboard API right now. Try again shortly.');
    return;
  }

  const data = toplists[server];
  const page = 0;
  const embed = BUILDERS[type](server, data, page);

  if (type === 'countries') {
    await message.reply({ embeds: [embed] });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(getListLength(type, data) / 10));
  const row = buildRow(server, type, page, totalPages);

  await message.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);

  fetchToplists(true).catch((e) => console.error('Initial fetch failed:', e.message));
  setInterval(() => {
    fetchToplists(true).catch((e) => console.error('Scheduled refresh failed:', e.message));
  }, 5 * 60 * 1000);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  if (commandName === 'help') {
    await message.reply({ embeds: [helpEmbed(PREFIX)] });
    return;
  }

  const type = COMMAND_MAP[commandName];
  if (!type) return; // not a recognized command, ignore silently

  const server = (args[0] || '').toLowerCase();
  if (!VALID_SERVERS.includes(server)) {
    await message.reply(
      `Usage: \`${PREFIX}${commandName} <gold|silver>\` — showing ${TYPE_LABELS[type]}.`
    );
    return;
  }

  try {
    await sendLeaderboard(message, type, server);
  } catch (err) {
    console.error('Command error:', err);
    await message.reply('Something went wrong pulling that leaderboard.').catch(() => {});
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() || !interaction.customId.startsWith('lb:')) return;

  const [, server, type, pageStr] = interaction.customId.split(':');
  const page = parseInt(pageStr, 10);

  await interaction.deferUpdate();

  let toplists;
  try {
    toplists = await fetchToplists();
  } catch (err) {
    console.error('Failed to fetch toplists:', err.message);
    return;
  }

  const data = toplists[server];
  const embed = BUILDERS[type](server, data, page);
  const totalPages = Math.max(1, Math.ceil(getListLength(type, data) / 10));
  const row = buildRow(server, type, page, totalPages);

  await interaction.editReply({ embeds: [embed], components: [row] });
});

client.login(process.env.DISCORD_TOKEN);

// --- Keepalive web server (for Render + UptimeRobot, same pattern as Zappy) ---
const app = express();
app.get('/', (req, res) => res.send('PRO Leaderboard bot is alive.'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Keepalive server running.');
});
