import type { Plugin, ResolvedConfig } from "vite";
import dedent from "dedent";
import path from "path";

const PLUGIN_NAME = 'vite-plugin-compiled-url';
const URLPARAM = 'compiled-url';

const compiledUrlRE = /(\?|&)compiled-url(?:&|$)/
const postfixRE = /[?#].*$/s
const stripCssExtRE = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)$/

export function ViteCompiledUrlPlugin(): Plugin {
    let config: ResolvedConfig | undefined

    return {
        name: PLUGIN_NAME,
        enforce: 'pre',

        configResolved(resolved) {
            config = resolved;
        },

        async resolveId(source, importer, options) {
            if (!compiledUrlRE.test(source))
                return;

            const target = removeQueryParams(source, 'compiled-url');
            const resolution = await this.resolve(target, importer, options);

            if (!resolution || resolution.external)
                return;

            let resolvedId = appendQueryParams(
                resolution.id,
                [
                    URLPARAM,
                    // We want this module to be ignored by any other modules
                    // that are attempting to process it. It's liable to not be
                    // a valid source file for whatever the extension happens
                    // to be.
                    //
                    // For most plugins, if they follow rollup conventions,
                    // then prepending '\0' to the string should cause them to
                    // ignore it. Unfortunately, the vite:css and vite:css-post
                    // plugins do not follow those conventions.
                    //
                    // Instead, the workaround is to add ?raw to the URL. This
                    // makes the css plugins ignore it. It would be interpreted
                    // by the vite:asset plugin but since we set enfore: "pre"
                    // our load function runs first and resolves it before the
                    // vite:asset plugin can get to it.
                    'raw',
                ]
            );

            return {
                id: '\0' + resolvedId,
                resolvedBy: PLUGIN_NAME,
                moduleSideEffects: false,
            }
        },

        async load(id, options) {
            if (!id.startsWith(`\0`))
                return;
            if (!compiledUrlRE.test(id))
                return;

            id = id.substring(1);
            id = removeQueryParams(id, ['compiled-url', 'raw']);

            let targetUrl = appendQueryParams(id, 'inline');
            if (config.command === "serve") {
                // When working in serve mode we do a bit of a hack: we emit
                // a ?inline qualified import and just convert that into a data
                // URI within the browser.
                //
                // This pretty much meets the goals of the plugin although it
                // is somewhat less efficient than I was hoping for.
                return dedent`
                    import content from ${JSON.stringify(targetUrl)};
                    export default 'data:text/css;base64,' + btoa(content); 
                `;
            } else {
                // In build mode things are a little bit simpler:
                // - We run the whole pipeline for <url>?inline and get the
                //   resulting code.
                // - We take that code, extract the CSS string, stick it in a
                //   new asset file, and emit it.
                // - Finally, we emit a rollup constant that evaluates to a URL
                //   to the asset from step 2.

                const target = await this.load({ id: targetUrl });

                let assetName = path.basename(cleanUrl(id))

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
    }
}

function cleanUrl(url: string): string {
    return url.replace(postfixRE, '')
}

function appendQueryParams(url: string, params: string | string[]): string {
    if (typeof params === "string")
        params = [params];
    
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

function removeQueryParams(url: string, params: string | string[]): string {
    if (typeof params === "string")
        params = [params];

    let filtered = extractQueryParams(url).filter(p => !params.includes(p));
    return appendQueryParams(cleanUrl(url), filtered);
}

