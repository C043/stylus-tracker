import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Colours live as tokens in src/routes/layout.css (AGENTS.md §5); components use the tokens.
const HEX_COLOUR = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})\b/gi;

const components = readdirSync('src', { recursive: true, encoding: 'utf8' })
	.filter((path) => path.endsWith('.svelte'))
	.map((path) => join('src', path));

describe('design tokens', () => {
	it('finds the components to check', () => {
		expect(components).toContain(join('src', 'routes', '+page.svelte'));
	});

	it.each(components)('%s uses colour tokens, not hex values', (path) => {
		expect(readFileSync(path, 'utf8').match(HEX_COLOUR) ?? []).toEqual([]);
	});
});
