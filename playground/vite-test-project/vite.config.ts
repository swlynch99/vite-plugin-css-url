import { defineConfig } from "vite";
import ViteCssUrlPlugin from 'vite-plugin-css-url';
import VitePluginInspect from 'vite-plugin-inspect';

export default defineConfig({
    build: {
        rollupOptions: {
            plugins: [
                ViteCssUrlPlugin(),
            ]
        }
    },
    plugins: [
        VitePluginInspect({
            outputDir: 'node_modules/.vite-inspect',
            build: true,
        }),
        ViteCssUrlPlugin(),
    ]
})