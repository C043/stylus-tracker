import { parse } from 'devalue';
import { describe, expect, it, vi } from 'vitest';
import { sendPlay } from './send-play';

// Kit's deserialize needs the app's transport set up, which only happens in the browser.
// Same format: JSON, with `data` encoded by devalue. The e2e tests cover the real one.
vi.mock('$app/forms', () => ({
	deserialize: (text: string) => {
		const result = JSON.parse(text);
		if (result.data) result.data = parse(result.data);
		return result;
	}
}));

const play = {
	id: '0b7f3c1e-6a2d-4f7e-9c41-2d5e8a9b1c3f',
	stylusId: 's1',
	kind: 'side',
	playedAt: '2026-10-23T21:15:00.000Z'
} as const;

const replying = (body: unknown, status = 200) =>
	vi.fn<typeof fetch>().mockResolvedValue(
		new Response(typeof body === 'string' ? body : JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' }
		})
	);

describe('sendPlay', () => {
	it('posts the play to the dashboard action as a form', async () => {
		const fetch = replying({ type: 'redirect', status: 303, location: '/' });

		await sendPlay(play, { fetch, action: '/?/play' });

		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe('/?/play');
		expect(init?.method).toBe('POST');
		expect(new Headers(init?.headers).get('x-sveltekit-action')).toBe('true');
		expect(Object.fromEntries(init?.body as FormData)).toEqual(play);
		expect(init?.signal).toBeInstanceOf(AbortSignal);
	});

	it('reports a play the server saved (it redirects)', async () => {
		const fetch = replying({ type: 'redirect', status: 303, location: '/' });

		expect(await sendPlay(play, { fetch, action: '/?/play' })).toEqual({ status: 'saved' });
	});

	it("passes on why the server won't take a play", async () => {
		// The action's failure data, serialised by SvelteKit (devalue).
		const data = JSON.stringify([{ stylusId: 1, error: 2 }, 's1', 'This stylus was replaced']);
		const fetch = replying({ type: 'failure', status: 400, data }, 400);

		expect(await sendPlay(play, { fetch, action: '/?/play' })).toEqual({
			status: 'rejected',
			reason: 'This stylus was replaced'
		});
	});

	it('gives a fallback reason when the failure has none', async () => {
		const fetch = replying({ type: 'failure', status: 400, data: JSON.stringify([{}]) }, 400);

		expect(await sendPlay(play, { fetch, action: '/?/play' })).toMatchObject({
			status: 'rejected',
			reason: expect.stringMatching(/\w/)
		});
	});

	it.each([
		[
			'the network is down',
			vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'))
		],
		['the server crashed', replying({ type: 'error', error: { message: 'Internal Error' } }, 500)],
		['a proxy answered instead', replying('<html>Bad Gateway</html>', 502)],
		['a captive portal answered', replying('<html>Log in to the Wi-Fi</html>')]
	])('retries later when %s', async (_, fetch) => {
		expect(await sendPlay(play, { fetch, action: '/?/play' })).toEqual({ status: 'unreachable' });
	});
});
