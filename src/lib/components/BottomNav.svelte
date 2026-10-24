<script lang="ts">
	import { resolve } from '$app/paths';

	interface Props {
		/** Current URL pathname; the layout passes `page.url.pathname`. */
		pathname: string;
	}

	let { pathname }: Props = $props();

	const tabs = [
		{ href: '/', label: 'Dashboard', icon: 'record' },
		{ href: '/turntables', label: 'Turntables', icon: 'turntable' },
		{ href: '/history', label: 'History', icon: 'history' },
		{ href: '/settings', label: 'Settings', icon: 'knob' }
	] as const;

	// "/" only matches itself; other tabs also own their nested routes.
	const isActive = (href: string) =>
		href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
</script>

<nav
	aria-label="Main"
	class="fixed inset-x-0 bottom-0 z-10 border-t border-alu-600/60 bg-walnut-950/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.45)] backdrop-blur"
>
	<ul class="mx-auto grid max-w-md grid-cols-4 px-[max(1rem,env(safe-area-inset-left))]">
		{#each tabs as tab (tab.href)}
			{@const active = isActive(tab.href)}
			<li>
				<a
					href={resolve(tab.href)}
					aria-current={active ? 'page' : undefined}
					class={[
						'flex min-h-14 min-w-11 flex-col items-center justify-center gap-1 font-mono text-xs tracking-wide uppercase transition-colors',
						active ? 'text-amber-glow' : 'text-alu-400 hover:text-cream-100'
					]}
				>
					<svg
						viewBox="0 0 24 24"
						class="size-6"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						aria-hidden="true"
					>
						{#if tab.icon === 'record'}
							<circle cx="12" cy="12" r="9" />
							<circle cx="12" cy="12" r="3" />
							<path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" stroke-linecap="round" />
						{:else if tab.icon === 'turntable'}
							<rect x="2.5" y="5" width="19" height="14" rx="2" />
							<circle cx="10" cy="12" r="4.5" />
							<path d="M18.5 7.5v6l-3 2.5" stroke-linecap="round" stroke-linejoin="round" />
						{:else if tab.icon === 'knob'}
							<circle cx="12" cy="13" r="6.5" />
							<path d="M12 13 9 9.5" stroke-linecap="round" />
							<path
								d="M4 18.5 3 19.5M3.5 13H2M5.2 7 4 6M12 4.5V3M18.8 7 20 6M20.5 13H22M20 18.5l1 1"
								stroke-linecap="round"
							/>
						{:else}
							<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" stroke-linecap="round" />
							<path d="M3 4v4h4" stroke-linecap="round" stroke-linejoin="round" />
							<path d="M12 7.5V12l3 2" stroke-linecap="round" stroke-linejoin="round" />
						{/if}
					</svg>
					{tab.label}
					<!-- Pilot lamp: lit on the current tab, like a hi-fi input selector. -->
					<span
						aria-hidden="true"
						class={[
							'size-1 rounded-full transition-colors',
							active ? 'bg-amber-glow shadow-[0_0_6px_var(--color-amber-glow)]' : 'bg-walnut-700'
						]}
					></span>
				</a>
			</li>
		{/each}
	</ul>
</nav>
