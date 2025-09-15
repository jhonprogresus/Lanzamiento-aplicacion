<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Grabadora - Emperatriz Arias</title>

    <!-- PWA Meta Tags -->
    <link rel="manifest" href="./manifest.json" />
    <meta name="theme-color" content="#111827" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Grabadora EA" />

    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script type="importmap">
{
  "imports": {
    "react-dom/": "https://aistudiocdn.com/react-dom@^19.1.1/",
    "react": "https://aistudiocdn.com/react@^19.1.1",
    "react/": "https://aistudiocdn.com/react@^19.1.1/",
    "@google/genai": "https://aistudiocdn.com/@google/genai@^1.19.0"
  }
}
</script>
</head>
  <body class="bg-gray-900 text-white font-sans">
    <div id="root"></div>
    <script type="text/babel" data-type="module" src="./index.tsx"></script>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('./sw.js').then(registration => {
            console.log('SW registered: ', registration);
          }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
        });
      }
    </script>
  </body>
</html>
