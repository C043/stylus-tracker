import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { STYLUS_PROFILES } from '../domain/stylus-profiles';
import {
	CUSTOM_IMAGE,
	PLACEHOLDER_IMAGE,
	catalog,
	catalogImage,
	catalogModels,
	findCatalogModel,
	turntableModelName
} from './turntables';

const inStatic = (path: string) => existsSync(join('static', path));

describe('turntable catalog', () => {
	it('has unique brand ids', () => {
		const ids = catalog.map((b) => b.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('has globally unique "<brand>/<model>" ids', () => {
		const ids = catalogModels().map((m) => m.catalogId);
		expect(new Set(ids).size).toBe(ids.length);
		for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+\/[a-z0-9-]+$/);
	});

	it('only declares images that exist under static/', () => {
		const missing = catalogModels()
			.flatMap((m) => (m.image ? [m.image] : []))
			.filter((image) => !inStatic(image));
		expect(missing).toEqual([]);
	});

	it('ships the placeholder and custom images', () => {
		expect(inStatic(PLACEHOLDER_IMAGE)).toBe(true);
		expect(inStatic(CUSTOM_IMAGE)).toBe(true);
	});

	it('only suggests known, non-custom stylus profiles', () => {
		for (const { defaultStylus } of catalogModels()) {
			if (!defaultStylus) continue;
			expect(Object.keys(STYLUS_PROFILES)).toContain(defaultStylus.profile);
			expect(defaultStylus.profile).not.toBe('custom');
		}
	});
});

describe('findCatalogModel', () => {
	it('finds a model with its brand by "<brand>/<model>" id', () => {
		expect(findCatalogModel('technics/sl-1500c')).toMatchObject({
			catalogId: 'technics/sl-1500c',
			brand: 'Technics',
			model: 'SL-1500C',
			defaultStylus: { cartridge: 'Ortofon 2M Red', profile: 'elliptical' }
		});
	});

	it.each(['technics/nope', 'nope/sl-1500c', 'sl-1500c', '', 'custom'])(
		'returns undefined for %j',
		(id) => {
			expect(findCatalogModel(id)).toBeUndefined();
		}
	);
});

describe('catalogImage', () => {
	it('uses the custom red stylus for custom turntables', () => {
		expect(catalogImage(null)).toBe(CUSTOM_IMAGE);
	});

	it('falls back to the placeholder for models without an image', () => {
		expect(catalogImage('technics/sl-1500c')).toBe(
			findCatalogModel('technics/sl-1500c')?.image ?? PLACEHOLDER_IMAGE
		);
	});

	it('falls back to the placeholder for an unknown catalog id', () => {
		expect(catalogImage('gone/model')).toBe(PLACEHOLDER_IMAGE);
	});
});

describe('turntableModelName', () => {
	it('names a catalog turntable by brand and model', () => {
		expect(turntableModelName({ catalogId: 'rega/planar-1', brand: null, model: null })).toBe(
			'Rega Planar 1'
		);
	});

	it.each([
		[{ brand: 'Crosley', model: 'Suitcase' }, 'Crosley Suitcase'],
		[{ brand: 'Crosley', model: null }, 'Crosley'],
		[{ brand: null, model: null }, 'Custom turntable']
	])('names a custom turntable %j as %j', (custom, expected) => {
		expect(turntableModelName({ catalogId: null, ...custom })).toBe(expected);
	});

	it('copes with a catalog id that is no longer in the catalog', () => {
		expect(turntableModelName({ catalogId: 'gone/model', brand: null, model: null })).toBe(
			'Unknown model'
		);
	});
});
