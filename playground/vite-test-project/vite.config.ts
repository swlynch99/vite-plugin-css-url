import { defineConfig } from "vite";
import { ViteCompiledUrlPlugin } from 'vite-plugin-compiled-url';
import VitePluginInspect from 'vite-plugin-inspect';

export default defineConfig({
    build: {
        rollupOptions: {
            plugins: [
                ViteCompiledUrlPlugin(),
            ]
        }
    },
    plugins: [
        VitePluginInspect({
            outputDir: 'node_modules/.vite-inspect',
            build: true,
        }),
        ViteCompiledUrlPlugin(),
    ]
})