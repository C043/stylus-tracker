# Stylus Tracker

Self-hosted, mobile-first PWA that tracks turntable stylus wear and tells you how many more
records you can safely play before replacing the stylus.

## Self-host

```sh
docker compose up -d
```

Open http://localhost:3000, or http://<your-computer's-LAN-IP>:3000 from your phone, and install
it to your home screen. Data lives in the `stylus-data` Docker volume.

Optional env: `PORT` (default 3000) and `ORIGIN`. Leave `ORIGIN` unset and the app works on any
address it's reached by, including behind a reverse proxy that sends `X-Forwarded-Proto`
(Caddy and Traefik do by default; for nginx add `proxy_set_header X-Forwarded-Proto $scheme;`
and `proxy_set_header Host $host;`). Set `ORIGIN=https://stylus.example.com` to accept form
submissions only from that one URL.

The app is single-user and has **no built-in login**. Run it on your LAN or behind a reverse
proxy that handles auth (Authelia, Caddy basic auth, Tailscale…).

## Develop

```sh
npm install
cp .env.example .env
npm run dev
npm run test:unit   # TDD watch mode
npm test            # unit + component + e2e
npm run test:docker # builds the image via docker-compose.yml, checks / and boot migrations
```

Contributors and coding agents: read [AGENTS.md](AGENTS.md) first. The project is developed TDD-style.
