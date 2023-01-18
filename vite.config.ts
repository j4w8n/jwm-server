import { sveltekit } from '@sveltejs/kit/vite';
import { supakit } from 'supakit/vite'
import type { UserConfig } from 'vite';

const config: UserConfig = {
	plugins: [sveltekit(), supakit()]
};

export default config;
