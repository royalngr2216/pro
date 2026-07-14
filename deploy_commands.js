require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'steal',
    description: 'Steal a custom emoji and add it to a server you manage',
    integration_types: [1], // 1 = USER_INSTALL (lets people install this to their own account)
    contexts: [0, 1, 2],    // 0 = Guild, 1 = BotDM, 2 = PrivateChannel - works everywhere
    options: [
      {
        name: 'emoji',
        description: 'Paste the emoji you want to steal',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('Registering global slash command...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('Done. Global commands can take up to an hour to show up everywhere.');
  } catch (err) {
    console.error(err);
  }
})();
