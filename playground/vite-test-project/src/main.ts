import './scss/inner.scss';
import styles from './scss/outer.scss?compiled-url';

async function updateBody() {
  let response = await fetch(styles as string);
  let content = await response.text();

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <p>The bundled CSS content is</p>
  <pre>${content}</pre>
  `
}

updateBody();
