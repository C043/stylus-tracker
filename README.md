# Stylus Tracker

Self-hosted, mobile-first PWA that tracks turntable stylus wear and tells you how many more
records you can safely play before replacing the stylus.

## Self-host

```sh
docker compose up -d
```

Open http://localhost:3000 and install it to your phone's home screen. Data lives in the
`stylus-data` Docker volume. Optional env: `PORT` (default 3000) and `ORIGIN` (the public URL,
needed behind a reverse proxy).

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
