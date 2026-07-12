const { EmbedBuilder } = require('discord.js');
const { HELP_ENTRIES } = require('./commandMap');

function helpEmbed(prefix) {
  const width = Math.max(...HELP_ENTRIES.map((e) => e.cmd.length)) + 1;

  const lines = HELP_ENTRIES.map(
    (e) => `${e.cmd.padEnd(width, ' ')} ${e.alias.padEnd(8, ' ')} ${e.desc}`
  );

  return new EmbedBuilder()
    .setColor(0x8b95a1)
    .setAuthor({ name: 'Pokemon Revolution Online' })
    .setTitle('Command Reference')
    .addFields({
      name: '\u200b',
      value: '```\n' + lines.join('\n') + '\n```',
    })
    .addFields({
      name: '\u200b',
      value: `Server argument accepts \`gold\` or \`silver\`. Example: \`${prefix}ladder gold\``,
    })
    .setTimestamp();
}

module.exports = { helpEmbed };
