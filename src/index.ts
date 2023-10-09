import type { Plugin, ResolvedConfig } from "vite";
import createDebugger from "debug";

const PLUGIN_NAME = 'vite-plugin-compiled-url';

const systemslabUrlRE = /(\?|&)systemslab-url(?:&|$)/
const postfixRE = /[?#].*$/s

const debug = createDebugger(PLUGIN_NAME);

export default function plugin(): Plugin {
    let config: ResolvedConfig | undefined

    return {
        name: PLUGIN_NAME,

        configResolved(resolved) {
            config = resolved;
        },
        
    }
}

