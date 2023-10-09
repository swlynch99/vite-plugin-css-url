import styles from './scss/outer.scss?url';

async function updateBody() {
  let response = await fetch(styles);
  let content = await response.text();

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <p>The bundled CSS content is</p>
  <code>${content}</code>
  `
}

updateBody();
