const http = require("node:http");
const fsSync = require("node:fs");
const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;
const cooldownMs = 30 * 60 * 1000;
const sessions = new Map();
const oauthStates = new Map();
const cooldowns = new Map();

function loadEnv() {
  const envPath = path.join(root, ".env");
  if (!fsSync.existsSync(envPath)) return;

  const lines = fsSync.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const port = Number(process.env.PORT || 4177);
const botToken = process.env.DISCORD_BOT_TOKEN;
const channelId = process.env.DISCORD_CHANNEL_ID;
const clientId = process.env.DISCORD_CLIENT_ID;
const clientSecret = process.env.DISCORD_CLIENT_SECRET;
const redirectUri = process.env.DISCORD_REDIRECT_URI || `http://127.0.0.1:${port}/auth/discord/callback`;

let gatewaySocket = null;
let gatewayHeartbeat = null;
let gatewaySequence = null;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function redirect(response, location, cookies = []) {
  response.writeHead(302, {
    Location: location,
    ...(cookies.length ? { "Set-Cookie": cookies } : {}),
  });
  response.end();
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator), decodeURIComponent(part.slice(separator + 1))];
      }),
  );
}

function cookie(name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  return parts.join("; ");
}

function getSession(request) {
  const sid = parseCookies(request).blanch_sid;
  if (!sid) return null;

  const session = sessions.get(sid);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(sid);
    return null;
  }

  return { sid, ...session };
}

function createSession(user) {
  const sid = crypto.randomBytes(24).toString("hex");
  sessions.set(sid, {
    user,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return sid;
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) {
        request.destroy();
        reject(new Error("Слишком большая заявка."));
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function clean(value) {
  return String(value || "").trim().slice(0, 900);
}

function discordTag(user) {
  if (!user) return "-";
  return user.discriminator && user.discriminator !== "0"
    ? `${user.username}#${user.discriminator}`
    : user.username;
}

function cooldownLeft(userId) {
  const last = cooldowns.get(userId) || 0;
  return Math.max(0, cooldownMs - (Date.now() - last));
}

function formatCooldown(ms) {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} мин.`;
}

function buildDiscordMessage(data, user) {
  return {
    content: "Новая заявка в BLANCH",
    allowed_mentions: { parse: [] },
    attachments: [{ id: 0, filename: "blanch-title.gif" }],
    embeds: [
      {
        title: "Заявка в семью BLANCH",
        color: 0xa70f18,
        image: { url: "attachment://blanch-title.gif" },
        fields: [
          { name: "Discord login", value: `${discordTag(user)} (${user.id})`, inline: false },
          { name: "Имя Фамилия IC | Возраст OOC", value: clean(data.identity) || "-", inline: false },
          { name: "Онлайн в день | Часовой пояс", value: clean(data.online) || "-", inline: false },
          { name: "В каких семьях были", value: clean(data.families) || "-", inline: false },
          { name: "Почему BLANCH", value: clean(data.reason) || "-", inline: false },
          { name: "Опыт на высоких должностях", value: clean(data.experience) || "-", inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

async function sendToDiscord(data, user) {
  if (!botToken || !channelId) {
    throw new Error("Не указаны DISCORD_BOT_TOKEN и DISCORD_CHANNEL_ID.");
  }

  const gifPath = path.join(root, "blanch-title.gif");
  const gif = await fs.readFile(gifPath);
  const form = new FormData();
  form.append("payload_json", JSON.stringify(buildDiscordMessage(data, user)));
  form.append("files[0]", new Blob([gif], { type: "image/gif" }), "blanch-title.gif");

  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord вернул ${response.status}: ${text}`);
  }
}

async function exchangeDiscordCode(code) {
  if (!clientId || !clientSecret) {
    throw new Error("Не указаны DISCORD_CLIENT_ID и DISCORD_CLIENT_SECRET.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Discord OAuth token error ${tokenResponse.status}: ${text}`);
  }

  const token = await tokenResponse.json();
  const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });

  if (!userResponse.ok) {
    const text = await userResponse.text();
    throw new Error(`Discord user error ${userResponse.status}: ${text}`);
  }

  return userResponse.json();
}

function sendGateway(payload) {
  if (gatewaySocket && gatewaySocket.readyState === WebSocket.OPEN) {
    gatewaySocket.send(JSON.stringify(payload));
  }
}

function connectGateway() {
  if (!botToken || typeof WebSocket !== "function") return;

  gatewaySocket = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

  gatewaySocket.addEventListener("message", (event) => {
    const payload = JSON.parse(event.data);
    const { op, d, s, t } = payload;

    if (s !== null) gatewaySequence = s;

    if (op === 10) {
      clearInterval(gatewayHeartbeat);
      gatewayHeartbeat = setInterval(() => sendGateway({ op: 1, d: gatewaySequence }), d.heartbeat_interval);
      sendGateway({
        op: 2,
        d: {
          token: botToken,
          intents: 0,
          properties: { os: "windows", browser: "blanch-site", device: "blanch-site" },
          presence: {
            status: "online",
            afk: false,
            activities: [{ name: "заявки BLANCH", type: 3 }],
          },
        },
      });
    }

    if (op === 1) sendGateway({ op: 1, d: gatewaySequence });
    if (op === 7 || op === 9) gatewaySocket.close();
    if (t === "READY") console.log(`Discord Gateway: bot online as ${d.user.username}.`);
  });

  gatewaySocket.addEventListener("close", () => {
    clearInterval(gatewayHeartbeat);
    gatewayHeartbeat = null;
    gatewaySocket = null;
    setTimeout(connectGateway, 5000);
  });
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(root, requested));

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        discordBotToken: Boolean(botToken),
        discordChannelId: Boolean(channelId),
        discordClientId: Boolean(clientId),
        discordClientSecret: Boolean(clientSecret),
        gateway: Boolean(gatewaySocket),
        port,
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/me") {
      const session = getSession(request);
      if (!session) {
        sendJson(response, 200, { ok: true, user: null, cooldownLeft: 0 });
        return;
      }

      sendJson(response, 200, {
        ok: true,
        user: session.user,
        cooldownLeft: cooldownLeft(session.user.id),
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/auth/discord") {
      if (!clientId) {
        sendJson(response, 500, { ok: false, message: "Не указан DISCORD_CLIENT_ID." });
        return;
      }

      const state = crypto.randomBytes(18).toString("hex");
      oauthStates.set(state, Date.now() + 10 * 60 * 1000);
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "identify",
        state,
        prompt: "none",
      });

      redirect(response, `https://discord.com/oauth2/authorize?${params}`, [cookie("blanch_oauth_state", state, { maxAge: 600 })]);
      return;
    }

    if (request.method === "GET" && url.pathname === "/auth/discord/callback") {
      const state = url.searchParams.get("state");
      const code = url.searchParams.get("code");
      const cookies = parseCookies(request);

      if (!state || !code || cookies.blanch_oauth_state !== state || !oauthStates.has(state)) {
        redirect(response, "/?login=failed", [cookie("blanch_oauth_state", "", { maxAge: 0 })]);
        return;
      }

      oauthStates.delete(state);
      const user = await exchangeDiscordCode(code);
      const sid = createSession({
        id: user.id,
        username: user.username,
        globalName: user.global_name,
        discriminator: user.discriminator,
        avatar: user.avatar,
      });

      redirect(response, "/?login=ok", [
        cookie("blanch_oauth_state", "", { maxAge: 0 }),
        cookie("blanch_sid", sid, { maxAge: 7 * 24 * 60 * 60 }),
      ]);
      return;
    }

    if (request.method === "POST" && url.pathname === "/auth/logout") {
      const session = getSession(request);
      if (session) sessions.delete(session.sid);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/apply") {
      const session = getSession(request);
      if (!session) {
        sendJson(response, 401, { ok: false, message: "Сначала войдите через Discord." });
        return;
      }

      const left = cooldownLeft(session.user.id);
      if (left > 0) {
        sendJson(response, 429, {
          ok: false,
          message: `Повторную заявку можно отправить через ${formatCooldown(left)}.`,
          cooldownLeft: left,
        });
        return;
      }

      const body = await readBody(request);
      const data = JSON.parse(body);

      for (const field of ["identity", "online", "families", "reason", "experience"]) {
        if (!clean(data[field])) {
          sendJson(response, 400, { ok: false, message: "Заполните все поля." });
          return;
        }
      }

      await sendToDiscord(data, session.user);
      cooldowns.set(session.user.id, Date.now());
      sendJson(response, 200, { ok: true, message: "Заявка отправлена.", cooldownLeft: cooldownMs });
      return;
    }

    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }

    response.writeHead(405);
    response.end("Method not allowed");
  } catch (error) {
    sendJson(response, 500, { ok: false, message: error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`BLANCH site: http://127.0.0.1:${port}`);
  connectGateway();
});
