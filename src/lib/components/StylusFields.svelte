<script lang="ts">
	import { computeBackfilledRecords, describeBackfill } from '../domain/backfill';
	import { calendarDaysBetween, isLocalDate, type LocalDate } from '../domain/dates';
	import { STYLUS_PROFILES } from '../domain/stylus-profiles';

	type Field = 'profile' | 'cartridge' | 'customLifespanHours' | 'installedOn';

	interface Props {
		values: Record<Field, string>;
		errors?: Partial<Record<Field, string>>;
		/** The user's local date: the latest allowed install date, sent as `today`. */
		today: LocalDate;
		/** The `max` of the date input, when it's not `today`. */
		latestInstalledOn?: LocalDate;
	}

	let { values, errors = {}, today, latestInstalledOn = today }: Props = $props();

	let profile = $derived(values.profile);
	// Once the user picks a date, keep it even if a new default arrives (the page swaps the
	// server's today for the phone's after hydration).
	let pickedInstalledOn = $state<string>();
	let installedOn = $derived(pickedInstalledOn ?? values.installedOn);

	let backfill = $derived.by(() => {
		if (!isLocalDate(installedOn) || calendarDaysBetween(installedOn, today) <= 0) return 0;
		return computeBackfilledRecords(installedOn, today);
	});

	let estimate = $derived(
		backfill > 0 ? `${describeBackfill(backfill, installedOn, today)} (one a day).` : ''
	);

	const profileOption = ({
		label,
		range
	}: (typeof STYLUS_PROFILES)[keyof typeof STYLUS_PROFILES]) =>
		range ? `${label} · ${range[0]}–${range[1]} h` : `${label} (enter hours)`;

	const input =
		'min-h-11 w-full rounded-lg border border-alu-600 bg-walnut-950 px-3 text-cream-50 placeholder:text-alu-400 focus:border-amber-glow focus:outline-none aria-invalid:border-oxblood';
	const field = 'flex flex-col gap-1.5 text-sm text-cream-100';
	const describedBy = (...ids: (string | false | undefined)[]) =>
		ids.filter(Boolean).join(' ') || undefined;
</script>

{#snippet fieldError(id: string, message: string | undefined)}
	{#if message}
		<span {id} class="font-mono text-xs text-cream-50">
			<span aria-hidden="true" class="mr-1 text-vu-soon">▲</span>{message}
		</span>
	{/if}
{/snippet}

<input type="hidden" name="today" value={today} />

<div class={field}>
	<label for="stylus-profile">Stylus type</label>
	<select
		id="stylus-profile"
		name="profile"
		bind:value={profile}
		class={input}
		aria-invalid={errors.profile ? 'true' : undefined}
		aria-describedby={describedBy('profile-hint', errors.profile && 'profile-error')}
	>
		{#each Object.values(STYLUS_PROFILES) as p (p.id)}
			<option value={p.id}>{profileOption(p)}</option>
		{/each}
	</select>
	<span id="profile-hint" class="text-xs text-cream-300">
		Not sure? Spherical is the most common on budget decks.
	</span>
	{@render fieldError('profile-error', errors.profile)}
</div>

{#if profile === 'custom'}
	<div class={field}>
		<label for="stylus-lifespan">Lifespan (hours)</label>
		<input
			id="stylus-lifespan"
			name="customLifespanHours"
			type="number"
			inputmode="decimal"
			min="1"
			step="any"
			required
			value={values.customLifespanHours}
			placeholder="500"
			class={input}
			aria-invalid={errors.customLifespanHours ? 'true' : undefined}
			aria-describedby={describedBy(errors.customLifespanHours && 'lifespan-error')}
		/>
		{@render fieldError('lifespan-error', errors.customLifespanHours)}
	</div>
{/if}

<div class={field}>
	<label for="stylus-cartridge">Cartridge <span class="text-cream-300">(optional)</span></label>
	<input
		id="stylus-cartridge"
		name="cartridge"
		value={values.cartridge}
		placeholder="e.g. Ortofon 2M Red"
		autocomplete="off"
		class={input}
		aria-invalid={errors.cartridge ? 'true' : undefined}
		aria-describedby={describedBy(errors.cartridge && 'cartridge-error')}
	/>
	{@render fieldError('cartridge-error', errors.cartridge)}
</div>

<div class={field}>
	<label for="stylus-installed">Installed on</label>
	<input
		id="stylus-installed"
		name="installedOn"
		type="date"
		max={latestInstalledOn}
		required
		bind:value={() => installedOn, (value) => (pickedInstalledOn = value)}
		class={[input, 'font-mono']}
		aria-invalid={errors.installedOn ? 'true' : undefined}
		aria-describedby={describedBy(errors.installedOn && 'installed-error')}
	/>
	{@render fieldError('installed-error', errors.installedOn)}
	<p aria-live="polite" class="min-h-5 font-mono text-xs text-amber-glow">
		{estimate}
	</p>
</div>
