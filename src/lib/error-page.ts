export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Something went wrong</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background:#0b0b0c; color:#f5f5f7; padding:24px; }
  .card { max-width: 420px; text-align:center; }
  h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
  p { margin: 0 0 1.25rem; opacity:.75; font-size:.95rem; }
  .row { display:flex; gap:.5rem; justify-content:center; flex-wrap:wrap; }
  button, a { font: inherit; padding:.55rem 1rem; border-radius:.5rem; border:1px solid #2a2a2e;
    background:#1c1c1f; color:#f5f5f7; cursor:pointer; text-decoration:none; }
  button.primary { background:#f5f5f7; color:#0b0b0c; border-color:#f5f5f7; }
</style>
</head>
<body>
  <div class="card">
    <h1>This page didn't load</h1>
    <p>Something went wrong on our end. Try refreshing or head back home.</p>
    <div class="row">
      <button class="primary" onclick="location.reload()">Try again</button>
      <a href="/">Go home</a>
    </div>
  </div>
</body>
</html>`;
}
