export default function handler(request, response) {
  response.setHeader('X-Robots-Tag', 'noindex');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.status(410).send('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Article retired — Astra</title></head><body><main><h1>This article has been retired</h1><p>Visit our current clinical library for updated articles.</p><a href="/articles">Browse the clinical library</a></main></body></html>');
}
