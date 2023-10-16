import type { ModuleNode, Plugin, PluginOption, ResolvedConfig, ViteDevServer } from "vite";
import path from "path";

const PLUGIN_NAME = 'vite-plugin-compiled-url';
const URL_PARAM = 'css-url';

function makeUrlParamRE(text: string): RegExp {
    return new RegExp(`(\\?|&)${text}(?:&|$)`);
}

const urlParamRE = makeUrlParamRE(URL_PARAM)
const directRE = makeUrlParamRE('direct')
const postfixRE = /[?#].*$/s
const stripCssExtRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)$/
const cssLangsRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)(?:$|\?)/

export function ViteCssUrlPlugin(): Plugin {
    let config: ResolvedConfig | undefined
    let server: ViteDevServer | undefined

    function relativeId(id: string): string {
        return id.startsWith(config!.root)
            ? '/' + path.posix.relative(config!.root, id)
            : id;
    }

    return {
        name: PLUGIN_NAME,
        enforce: 'pre',

        configResolved(resolved) {
            config = resolved;
        },

        configureServer(_server) {
            server = _server;
        },

        async resolveId(source, importer, options) {
            if (!urlParamRE.test(source))
                return;
            if (!cssLangsRE.test(source)) {
                this.error(`?css-url imports can only be used with css files`);
            }

            const target = removeQueryParams(source, URL_PARAM);
            const resolution = await this.resolve(target, importer, options);

            if (!resolution || resolution.external)
                return;

            let resolvedId = appendQueryParams(
                mapQueryUrl(resolution.id, url => url + '.js'),
                URL_PARAM,
            );

            return {
                id: resolvedId,
                resolvedBy: PLUGIN_NAME,
                moduleSideEffects: false,
            }
        },

        async load(id) {
            if (!urlParamRE.test(id))
                return;

            id = removeQueryParams(id, URL_PARAM);

            const targetId = mapQueryUrl(id, url => stripSuffix(url, '.js'));
            const relativeTarget = relativeId(targetId);

            if (config.command === "serve") {
                // 

                let targetUrl = appendQueryParams(relativeTarget, 'direct', `t=${Date.now()}`);
                return `export default ${JSON.stringify(targetUrl)};`;
            } else {
                // In build mode things are a little bit simpler:
                // - We run the whole pipeline for <url>?inline and get the
                //   resulting code.
                // - We take that code, extract the CSS string, stick it in a
                //   new asset file, and emit it.
                // - Finally, we emit a rollup constant that evaluates to a URL
                //   to the asset from step 2.

                const targetUrl = appendQueryParams(targetId, 'inline');
                const target = await this.load({ id: targetUrl });

                let assetName = path.basename(cleanUrl(targetId))

                // Canonicalize various css extensions down to '.css'
                assetName = assetName.replace(stripCssExtRE, '.css')

                const content = JSON.parse(target.code.substring("export default ".length));
                const referenceId = this.emitFile({
                    type: 'asset',
                    name: assetName,
                    source: content,
                    needsCodeReference: true
                });

                return `export default import.meta.ROLLUP_FILE_URL_${referenceId}`
            }
        },

        /**
         * Manually propagate HMR updates from `<file.css>?direct` modules to
         * the compiled `<file.css.js>?css-url` files.
         * 
         * The problem we have with this extension is that `file.css.js?css-url`
         * has a HMR dependency on `file.css?direct` but rollup doesn't know
         * about this dependency. We resolve this by manually scanning for
         * the relevant dependency whenever we get a HMR update.
         */
        async handleHotUpdate(ctx) {
            const moduleGraph = ctx.server.moduleGraph;
            const seen = new Set();
            const stack: ModuleNode[] = [];

            for (const module of ctx.modules) {
                if (module.id) {
                    stack.push(module);
                    seen.add(module.id || module.file);
                    continue;
                }

                for (const file of moduleGraph.getModulesByFile(module.file)) {
                    stack.push(file);
                    seen.add(file.id || file.file);
                }
            }

            while (stack.length !== 0) {
                let module = stack.pop();

                // Whenever we get a ?direct module check to see if there is a
                // corresponding ?css-url module. If so, tell the dev server to
                // reload the ?css-url module.
                if (directRE.test(module.id)) {
                    const strippedId = removeQueryParams(module.id, 'direct');
                    const jsId = mapQueryUrl(strippedId, url => url + '.js');
                    const targetId = appendQueryParams(jsId, URL_PARAM);

                    const targetModule = moduleGraph.getModuleById(targetId);
                    if (targetModule) {
                        ctx.server.reloadModule(targetModule);
                    }
                }

                // Don't propagate through self-accepting modules.
                //
                // ?direct modules are considered to be self-accepting so we
                // need to propagate through them manually.
                if (module.isSelfAccepting)
                    continue;
                
                for (const importer of module.importers) {
                    if (seen.has(importer.id))
                        continue;

                    seen.add(importer.id || importer.file);
                    stack.push(importer);
                }
            }
        },
    };
}

function cleanUrl(url: string): string {
    return url.replace(postfixRE, '')
}

function appendQueryParams(url: string, ...params: string[]): string {
    if (params.length === 0)
        return url;

    let separator = url.includes('?') ? '&' : '?';
    let query = params.join('&');

    return `${url}${separator}${query}`;
}

function extractQueryParams(url: string): string[] {
    let query = url.split('?', 2)[1];

    if (!query)
        return [];
    return query.split('&');
}

function removeQueryParams(url: string, ...params: string[]): string {
    let filtered = extractQueryParams(url).filter(p => !params.includes(p));
    return appendQueryParams(cleanUrl(url), ...filtered);
}

function mapQueryUrl(url: string, func: (url: string) => string): string {
    let [baseurl, query] = url.split('?', 2);
    let params = query ? query.split('&') : [];

    return appendQueryParams(func(baseurl), ...params);
}

function stripPrefix(str: string, pattern: string): string {
    if (str.startsWith(pattern))
        return str.substring(pattern.length);
    return str;
}

function stripSuffix(str: string, pattern: string): string {
    if (str.endsWith(pattern))
        return str.substring(0, str.length - pattern.length);
    return str;
}
