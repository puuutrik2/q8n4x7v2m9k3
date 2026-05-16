# BLANCH Family Site

Site and Discord bot for BLANCH Family GTA 5 RP.

## Run locally

1. Copy `.env.example` to `.env`.
2. Fill Discord values.
3. Start:

```powershell
npm start
```

Open:

```text
http://127.0.0.1:4183
```

## Deploy

Use a Node.js hosting provider such as Render, Railway, Fly.io, or a VPS.

Start command:

```text
npm start
```

Required environment variables:

```text
DISCORD_BOT_TOKEN=
DISCORD_CHANNEL_ID=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
DISCORD_REDIRECT_URI=https://your-domain/auth/discord/callback
PORT=10000
```

Do not commit `.env`; it contains Discord tokens.
