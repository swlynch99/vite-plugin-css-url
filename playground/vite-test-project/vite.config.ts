import { defineConfig } from "vite";
import { ViteCompiledUrlPlugin } from 'vite-plugin-compiled-url';

export default defineConfig({
    plugins: [
        ViteCompiledUrlPlugin()
    ]
})