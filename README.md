# vite-plugin-css-url

This [vite] plugin allows you to `?url` import css files and have them resolve
to the final bundled css file.

In short, you can write `import styles from './my/styles.scss?url'` and have
it actually work as you would expect. If you try to do this in vite it will
sorta work in development mode but in release mode it will return the raw
source code for the styles file (see https://github.com/vitejs/vite/issues/2522).

[vite]: https://github.com/vitejs/vite

## Installation
### npm
```
npm install --save-dev vite-plugin-css-url
```

### yarn
```
yarn install -D vite-plugin-css-url
```

### pnpm
```
pnpm install -D vite-plugin-css-url
```

## Usage
Use the plugin in your vite config
```js
import ViteCssUrlPlugin from 'vite-plugin-css-url';

export default {
    plugins: [
        ViteCssUrlPlugin(),
    ]
}
```
