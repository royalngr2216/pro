# PRO Leaderboard Bot

Discord bot showing live PvP, Random, Money, Guild, Playtime, and Country
leaderboards from the Pokemon Revolution Online dashboard — no login required,
since the /graphql endpoint is public.

Prefix-based (^), no slash commands.

## Commands

```
^ladder <gold|silver>       ^l       PvP ranked ladder
^guildladder <gold|silver>  ^gl      Top PvP guilds
^moneyladder <gold|silver>  ^money   Richest players
^randomladder <gold|silver> ^rl      Random battle ladder
^playtime <gold|silver>     ^pt      Most time ingame
^countries <gold|silver>    ^c       Players by country
^help                                Shows this list
```

Example: `^ladder gold` or `^l silver`

Longer lists get Prev/Next buttons under the embed.

## Setup (from mobile: GitHub app + Render, same flow as Zappy)

1. Create a new GitHub repo, upload all these files.
2. On the Discord Developer Portal, open your application -> Bot tab:
   - Copy the Bot Token -> DISCORD_TOKEN in Render env vars
   - IMPORTANT: scroll to "Privileged Gateway Intents" and turn ON
     MESSAGE CONTENT INTENT. Prefix commands read raw message text, so
     without this toggle the bot will see every message as empty and none of
     the ^ commands will fire.
   - Under OAuth2 -> URL Generator: tick the bot scope, permissions
     Send Messages + Embed Links + Read Message History, use that link to
     invite the bot to your server.
3. On Render: New -> Web Service -> connect the GitHub repo.
   - Build command: npm install
   - Start command: npm start
   - Add environment variable: DISCORD_TOKEN
4. Set up UptimeRobot pointed at your Render URL, same as with Zappy, to
   keep the free-tier service awake.

## Notes

- Data is cached in memory for 5 minutes and refreshed automatically in the
  background, so commands respond instantly instead of hitting the API every
  time.
- If PRO ever locks the /graphql endpoint down behind auth, we'll need to
  revisit with a login flow -- but as captured, it's open.
- Embeds use a plain monospace table layout instead of emoji-heavy fields --
  intentional, for a cleaner "stats dashboard" look.
