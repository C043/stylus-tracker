import { findCatalogModel } from '../../catalog/turntables';
import {
	addDays,
	calendarDaysBetween,
	formatShortDate,
	isLocalDate,
	resolveToday,
	type LocalDate
} from '../../domain/dates';
import { STYLUS_PROFILES, type StylusProfileId } from '../../domain/stylus-profiles';
import type { Db } from '../db/client';
import {
	addStylus,
	getActiveStylus,
	listStyli,
	replaceStylus,
	updateInstalledOn,
	type NewStylus,
	type Stylus
} from '../repositories/styli';
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

/** Form values to replace `previous`: same profile, cartridge and lifespan, installed today. */
export function replacementDefaults(previous: Stylus, today: LocalDate): StylusFormValues {
	return {
		profile: previous.profile,
		cartridge: previous.cartridge ?? '',
		customLifespanHours: previous.customLifespanHours?.toString() ?? '',
		installedOn: today
	};
}

interface Validated {
	values: StylusFormValues;
	errors: Partial<Record<Field | 'form', string>>;
	today: LocalDate;
	customLifespanHours: number | null;
}

/** Field checks shared by adding and replacing a stylus. */
function validateStylus(form: FormData, serverToday: LocalDate): Validated {
	const values = readValues(form, FIELDS);
	let today = resolveToday(text(form, 'today'), serverToday);
	// Without JS the page can only send the server's date, which may be a day behind the
	// user's. An install date one day ahead of it is then the user's today, not the future.
	if (text(form, 'today') === serverToday && values.installedOn === addDays(serverToday, 1)) {
		today = values.installedOn;
	}
	const errors: Validated['errors'] = {};

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

	return { values, errors, today, customLifespanHours };
}

function toNewStylus(turntableId: string, v: Validated): NewStylus {
	return {
		turntableId,
		profile: v.values.profile as StylusProfileId,
		cartridge: v.values.cartridge || null,
		customLifespanHours: v.customLifespanHours,
		installedOn: v.values.installedOn,
		today: v.today
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
	const validated = validateStylus(form, serverToday);
	const { values, errors } = validated;

	if (getActiveStylus(db, turntableId)) {
		errors.form = 'This turntable already has a stylus';
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors, values };
	return { ok: true, value: addStylus(db, toNewStylus(turntableId, validated)) };
}

/**
 * Retires the stylus named in the `replacing` field (the user's today) and installs the new
 * one. Refuses if that stylus is no longer the active one, so a stale tab or a resubmitted
 * form can't retire the stylus that replaced it.
 */
export function replaceStylusFromForm(
	db: Db,
	turntableId: string,
	form: FormData,
	serverToday: LocalDate
): FormResult<Stylus, Field> {
	const validated = validateStylus(form, serverToday);
	const { values, errors } = validated;

	const active = getActiveStylus(db, turntableId);
	if (!active) {
		errors.form = 'This turntable has no stylus to replace';
	} else if (active.id !== text(form, 'replacing')) {
		errors.form = 'That stylus has already been replaced';
	} else if (
		!errors.installedOn &&
		calendarDaysBetween(active.installedOn, values.installedOn) < 0
	) {
		errors.installedOn = `It can't be before the old stylus went in (${formatShortDate(active.installedOn, validated.today)})`;
	}

	if (Object.keys(errors).length > 0) return { ok: false, errors, values };
	return { ok: true, value: replaceStylus(db, toNewStylus(turntableId, validated)) };
}

/**
 * Corrects the active stylus's install date (AGENTS.md §3.4). The `stylusId` field names the
 * stylus the form was opened for, so a stale form can't move the date of its replacement.
 */
export function editInstalledOnFromForm(
	db: Db,
	turntableId: string,
	form: FormData
): FormResult<Stylus, 'installedOn'> {
	const values = readValues(form, ['installedOn'] as const);
	const { installedOn } = values;
	const errors: Partial<Record<'installedOn' | 'form', string>> = {};

	const active = getActiveStylus(db, turntableId);
	if (!active || active.id !== text(form, 'stylusId')) {
		errors.form = 'That stylus has been replaced since you opened this page';
	} else if (!isLocalDate(installedOn)) {
		errors.installedOn = 'Enter the date you installed it';
	} else if (calendarDaysBetween(installedOn, active.createdOn) < 0) {
		const added = formatShortDate(active.createdOn, active.createdOn);
		errors.installedOn = `It can't be after you added it (${added})`;
	} else {
		const previous = listStyli(db, turntableId).find((s) => s.retiredOn !== null);
		if (previous && calendarDaysBetween(previous.installedOn, installedOn) < 0) {
			const date = formatShortDate(previous.installedOn, active.createdOn);
			errors.installedOn = `It can't be before the previous stylus went in (${date})`;
		}
	}

	if (!active || Object.keys(errors).length > 0) return { ok: false, errors, values };
	return { ok: true, value: updateInstalledOn(db, active.id, installedOn) };
}
