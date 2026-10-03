import react from '@vitejs/plugin-react';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import {defineConfig} from 'vite';

export default defineConfig({
	base: './',
	publicDir: false,
	build: {
		emptyOutDir: true,
		outDir: 'dist/player',
		rollupOptions: {
			input: 'player.html'
		},
		target: browserslistToEsbuild(['>0.2%', 'not dead', 'not op_mini all'])
	},
	plugins: [react()]
});
