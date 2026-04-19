/* Register PWA service worker */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        if (import.meta.env.DEV) {
          console.log('SW registered:', registration.scope);
        }

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch(error => {
        if (import.meta.env.DEV) {
          console.log('SW registration failed:', error);
        }
      });
  });
}
