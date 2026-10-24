// Component tests render outside +layout.svelte; load the global styles and
// design tokens so layout assertions (tap targets etc.) see real CSS.
import './routes/layout.css';
