import { findCatalogModel } from '../../catalog/turntables';
import {
	addDays,
	calendarDaysBetween,
	isLocalDate,
	resolveToday,
	type LocalDate
} from '../../domain/dates';
import { STYLUS_PROFILES, type StylusProfileId } from '../../domain/stylus-profiles';
import type { Db } from '../db/client';
import { addStylus, getActiveStylus, type Stylus } from '../repositories/styli';
import type { Turntable } from '../repositories/turntables';
import { readValues, text, type FormResult } from './fields';

export const DEFAULT_PROFILE: StylusProfileId = 'spherical';
export const MAX_CARTRIDGE = 80;
export const MAX_LIFESPAN_HOURS = 100_000;

const FIELDS = ['profile', 'cartridge', 'customLifespanHours', 'installedOn'] as const;
type Field = (typeof FIELDS)[number];
export type StylusFormValues = Record<Field, string>;

const isProfile = (value: string): value is StylusProfileId =>
	Object.hasOwn(STYLUS_PROFILES, value);

/** Initial form values: the catalog model's suggested stylus, installed today. */
export function stylusDefaults(turntable: Turntable, today: LocalDate): StylusFormValues {
	const suggested = turntable.catalogId
		? findCatalogModel(turntable.catalogId)?.defaultStylus
		: undefined;
	return {
		profile: suggested?.profile ?? DEFAULT_PROFILE,
		cartridge: suggested?.cartridge ?? '',
		customLifespanHours: '',
		installedOn: today
	};
}

/**
 * Installs the first stylus on a turntable. `serverToday` is the fallback when the browser
 * didn't send a plausible local date in the `today` field.
 */
export function addStylusFromForm(
	db: Db,
	turntableId: string,
	form: FormData,
	serverToday: LocalDate
): FormResult<Stylus, Field> {
	const values = readValues(form, FIELDS);
	let today = resolveToday(text(form, 'today'), serverToday);
	// Without JS the page can only send the server's date, which may be a day behind the
	// user's. An install date one day ahead of it is then the user's today, not the future.
	if (text(form, 'today') === serverToday && values.installedOn === addDays(serverToday, 1)) {
		today = values.installedOn;
	}
	const errors: Partial<Record<Field | 'form', string>> = {};

	if (!isProfile(values.profile)) errors.profile = 'Pick a stylus type';
	if (values.cartridge.length > MAX_CARTRIDGE) {
		errors.cartridge = `Keep it under ${MAX_CARTRIDGE} characters`;
	}

	let customLifespanHours: number | null = null;
	if (values.profile === 'custom') {
		const hours = Number(values.customLifespanHours);
		if (!values.customLifespanHours || !(hours > 0) || hours > MAX_LIFESPAN_HOURS) {
			errors.customLifespanHours = 'Enter the lifespan in hours, e.g. 500';
		} else {
			customLifespanHours = hours;
		}
	}

	if (!isLocalDate(values.installedOn)) {
		errors.installedOn = 'Enter the date you installed it';
	} else if (calendarDaysBetween(values.installedOn, today) < 0) {
		errors.installedOn = "The install date can't be in the future";
	}

	if (getActiveStylus(db, turntableId)) {
		errors.form = 'This turntable already has a stylus';
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors, values };
	return {
		ok: true,
		value: addStylus(db, {
			turntableId,
			profile: values.profile as StylusProfileId,
			cartridge: values.cartridge || null,
			customLifespanHours,
			installedOn: values.installedOn,
			today
		})
	};
}
