import styles from './scss/outer.scss?url';

if (import.meta.hot) {
  import.meta.hot.accept('./scss/outer.scss?url', (module: any) => {
    const styles = module.default;

    if (typeof styles !== "string") {
      import.meta.hot?.invalidate();
      return;
    }

    updateBody(styles);
  })
}

async function updateBody(styles: string) {
  let response = await fetch(styles);
  let content = await response.text();

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <p>The bundled CSS content is</p>
  <pre>${content}</pre>
  <p>and its URL is <code>${styles}</code></p>
  `
}

updateBody(styles);
