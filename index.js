require('dotenv').config();
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} = require('discord.js');

// ---------- Keep-alive web server (needed for Render Web Service + UptimeRobot) ----------
const app = express();
app.get('/', (req, res) => res.send('Emoji Stealer bot is alive.'));
app.listen(process.env.PORT || 3000, () => {
  console.log('Keep-alive server running.');
});

// ---------- Discord client ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

const EMOJI_REGEX = /<(a?):(\w+):(\d+)>/;

client.on('interactionCreate', async (interaction) => {
  // ---- /steal command ----
  if (interaction.isChatInputCommand() && interaction.commandName === 'steal') {
    const input = interaction.options.getString('emoji');
    const match = input.match(EMOJI_REGEX);

    if (!match) {
      return interaction.reply({
        content: "That doesn't look like a custom emoji. Paste the emoji itself (not just its name).",
        ephemeral: true,
      });
    }

    const [full, animatedFlag, name, id] = match;
    const isAnimated = animatedFlag === 'a';

    // Only show servers where: the bot is present AND the invoking user has Manage Emoji permission there.
    const eligibleGuilds = [];
    for (const guild of client.guilds.cache.values()) {
      try {
        const member = await guild.members.fetch(interaction.user.id);
        if (member.permissions.has(PermissionFlagsBits.CreateGuildExpressions)) {
          eligibleGuilds.push(guild);
        }
      } catch {
        // user isn't in this guild, or fetch failed - skip it
      }
    }

    if (eligibleGuilds.length === 0) {
      return interaction.reply({
        content:
          "I couldn't find any server where both I'm present and you have Manage Emoji permission.",
        ephemeral: true,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`steal_target|${id}|${name}|${isAnimated ? 1 : 0}|${full}`)
      .setPlaceholder('Choose a server to add this emoji to')
      .addOptions(
        eligibleGuilds.slice(0, 25).map((g) => ({
          label: g.name,
          value: g.id,
        }))
      );

    return interaction.reply({
      content: `Where do you want to add ${full}?`,
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true,
    });
  }

  // ---- server selected from dropdown ----
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('steal_target|')) {
    const [, emojiId, emojiName, animatedFlag, fullEmoji] = interaction.customId.split('|');
    const targetGuild = client.guilds.cache.get(interaction.values[0]);

    if (!targetGuild) {
      return interaction.update({ content: 'That server is no longer available.', components: [] });
    }

    const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${animatedFlag === '1' ? 'gif' : 'png'}`;

    try {
      await targetGuild.emojis.create({ attachment: emojiUrl, name: emojiName });

      await interaction.update({
        content: `Added **${emojiName}** to **${targetGuild.name}**.`,
        components: [],
      });

      // Public announcement in the channel the command was used in.
      // Works even in servers the bot isn't a member of, since this rides
      // on the interaction token (user-installed app behavior).
      await interaction.followUp({
        content: `**@${interaction.user.username}** stole ${fullEmoji} successfully.`,
        ephemeral: false,
      });
    } catch (err) {
      console.error(err);
      await interaction.update({
        content: `Failed to add the emoji: ${err.message}`,
        components: [],
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
