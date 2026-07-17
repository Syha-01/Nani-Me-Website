# Nani-Me-Website

Landing page for the **Nani-me** anime apps (Android phone + Android TV).

Static site — plain HTML, CSS, and JS, no build step.

- `index.html` — the page
- `style.css` — styles
- `script.js` — nav, reveal animations, download-button handling
- `images/` — showcase artwork

## Local preview

Open `index.html` in a browser, or serve the folder:

```
python3 -m http.server 8000
```

## Deploy (Vercel)

No configuration needed — Vercel serves the static files as-is. Import the repo and deploy; the root `index.html` is the entry point.
