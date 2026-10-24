// Production entry (replaces `node build`). Node only ever serves plain HTTP here, so unless a
// reverse proxy says otherwise via X-Forwarded-Proto, the request protocol is `http`.
// adapter-node otherwise assumes `https` (or a fixed ORIGIN), which makes Kit's CSRF check
// reject every form POST when the app is opened from a phone at http://<lan-ip>:3000.
// Set ORIGIN to pin the public URL instead; it takes precedence over the headers.
import http from 'node:http';
import process from 'node:process';

process.env.PROTOCOL_HEADER ||= 'x-forwarded-proto';
const protocolHeader = process.env.PROTOCOL_HEADER.toLowerCase();

// Read at import time by adapter-node, so import after setting PROTOCOL_HEADER.
const { handler } = await import('./build/handler.js');

const server = http.createServer((req, res) => {
	req.headers[protocolHeader] ||= 'http';
	handler(req, res, () => {
		res.statusCode = 404;
		res.end();
	});
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
server.listen(port, host, () => console.log(`Listening on http://${host}:${port}`));

// PID 1 in Docker: exit cleanly on `docker compose down` instead of waiting to be killed.
for (const signal of ['SIGTERM', 'SIGINT']) {
	process.once(signal, () => {
		server.close(() => process.exit(0));
		server.closeIdleConnections();
	});
}
