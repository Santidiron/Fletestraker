/* ============================================================
   PWA: prompt de instalación y registro del service worker.
   ============================================================ */
let deferredPrompt = null;

function showInstallButton() {
  const button = document.getElementById('install-pwa-btn');
  if (button) {
    button.style.display = 'inline-block';
  }
}

async function installPwa() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    console.log('PWA aceptada para instalación');
  }
  deferredPrompt = null;
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Registro de service worker fallido:', error);
    });
  });
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  showInstallButton();
});

window.addEventListener('appinstalled', () => {
  const button = document.getElementById('install-pwa-btn');
  if (button) {
    button.style.display = 'none';
  }
});
