/* ============================================================
   Punto de entrada: inicializa la UI y la sesión al cargar el DOM.
   Debe cargarse último.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const installButton = document.getElementById('install-pwa-btn');
  if (installButton) {
    installButton.addEventListener('click', installPwa);
  }
  calcHoras();
  calcKm();
  renderHistory();

  if (window.FletesDB) {
    FletesDB.onAuthChange((session) => {
      if (session) {
        if (!appBooted) {
          appBooted = true;
          bootApp(session);
        } else {
          showAuth(false);
        }
      } else {
        appBooted = false;
        currentUser = null;
        showAuth(true);
      }
    });
  }
});
