import type { StylusProfileId } from '../domain/stylus-profiles';

export interface CatalogModel {
	id: string;
	model: string;
	/** Path under /static, e.g. /turntables/technics/sl-1500c.webp */
	image: string;
	/** Pre-fills the stylus form. Verify against the manufacturer before relying on it. */
	defaultStylus?: { cartridge: string; profile: StylusProfileId };
}

export interface CatalogBrand {
	id: string;
	brand: string;
	models: CatalogModel[];
}

export const PLACEHOLDER_IMAGE = '/turntables/_placeholder.svg';
export const CUSTOM_IMAGE = '/turntables/custom-red-stylus.svg';

const m = (
	brandId: string,
	id: string,
	model: string,
	defaultStylus?: CatalogModel['defaultStylus']
): CatalogModel => ({ id, model, image: `/turntables/${brandId}/${id}.webp`, defaultStylus });

export const catalog: CatalogBrand[] = [
	{
		id: 'technics',
		brand: 'Technics',
		models: [
			m('technics', 'sl-1200mk7', 'SL-1200MK7'),
			m('technics', 'sl-1210gr', 'SL-1210GR'),
			m('technics', 'sl-1500c', 'SL-1500C', { cartridge: 'Ortofon 2M Red', profile: 'elliptical' }),
			m('technics', 'sl-100c', 'SL-100C', {
				cartridge: 'Audio-Technica AT-VM95C',
				profile: 'spherical'
			})
		]
	},
	{
		id: 'audio-technica',
		brand: 'Audio-Technica',
		models: [
			m('audio-technica', 'at-lp60x', 'AT-LP60X', { cartridge: 'ATN3600L', profile: 'spherical' }),
			m('audio-technica', 'at-lp70x', 'AT-LP70X', { cartridge: 'ATN3600L', profile: 'spherical' }),
			m('audio-technica', 'at-lp120xusb', 'AT-LP120XUSB', {
				cartridge: 'AT-VM95E',
				profile: 'elliptical'
			}),
			m('audio-technica', 'at-lp5x', 'AT-LP5X', { cartridge: 'AT-VM95E', profile: 'elliptical' })
		]
	},
	{
		id: 'pro-ject',
		brand: 'Pro-Ject',
		models: [
			m('pro-ject', 'debut-carbon-evo', 'Debut Carbon EVO', {
				cartridge: 'Ortofon 2M Red',
				profile: 'elliptical'
			}),
			m('pro-ject', 't1', 'T1'),
			m('pro-ject', 'e1', 'E1'),
			m('pro-ject', 'x1', 'X1')
		]
	},
	{
		id: 'rega',
		brand: 'Rega',
		models: [
			m('rega', 'planar-1', 'Planar 1', { cartridge: 'Rega Carbon', profile: 'spherical' }),
			m('rega', 'planar-2', 'Planar 2'),
			m('rega', 'planar-3', 'Planar 3')
		]
	},
	{
		id: 'u-turn',
		brand: 'U-Turn',
		models: [m('u-turn', 'orbit-basic', 'Orbit Basic'), m('u-turn', 'orbit-plus', 'Orbit Plus')]
	},
	{
		id: 'denon',
		brand: 'Denon',
		models: [
			m('denon', 'dp-300f', 'DP-300F', { cartridge: 'Denon DSN-85', profile: 'spherical' }),
			m('denon', 'dp-450usb', 'DP-450USB')
		]
	},
	{
		id: 'fluance',
		brand: 'Fluance',
		models: [
			m('fluance', 'rt81', 'RT81', { cartridge: 'Audio-Technica AT95E', profile: 'elliptical' }),
			m('fluance', 'rt85', 'RT85', { cartridge: 'Ortofon 2M Blue', profile: 'nude-elliptical' })
		]
	},
	{
		id: 'thorens',
		brand: 'Thorens',
		models: [m('thorens', 'td-202', 'TD 202'), m('thorens', 'td-1500', 'TD 1500')]
	},
	{
		id: 'sony',
		brand: 'Sony',
		models: [m('sony', 'ps-lx310bt', 'PS-LX310BT')]
	},
	{
		id: 'crosley',
		brand: 'Crosley',
		models: [m('crosley', 'cruiser', 'Cruiser', { cartridge: 'Crosley NP6', profile: 'sapphire' })]
	}
];
