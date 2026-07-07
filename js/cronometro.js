/* ============================================================
   Cronómetros (por horas y por km).

   Fábrica de cronómetros. Ambos cronómetros comparten toda la
   lógica; solo difieren en los IDs de sus elementos, el texto de
   ganancia y una acción opcional al finalizar. El tiempo se calcula
   con marcas de tiempo reales (Date.now) para no atrasarse cuando el
   navegador congela setInterval mientras la página está en segundo plano.

   El estado se persiste en localStorage (clave `storageKey`) para que el
   cronómetro sobreviva a que el navegador o el sistema operativo maten la
   página en segundo plano (algo habitual en móvil/PWA): al reabrir la app se
   restaura el estado y se recalcula el tiempo transcurrido desde la marca real.
   ============================================================ */
function crearCronometro({ displayId, earningId, startId, pauseId, useId, storageKey, formatEarning, onFinish }) {
  let baseSeconds = 0; // segundos acumulados antes del tramo actual
  let startMs = 0; // marca de tiempo (ms) en que arrancó el tramo actual
  let interval = null;
  let running = false;

  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, '0');

  // Segundos totales transcurridos: los acumulados más, si está corriendo, los
  // del tramo actual calculados desde la marca de tiempo real.
  function currentSeconds() {
    if (running) {
      return baseSeconds + Math.max(0, Math.floor((Date.now() - startMs) / 1000));
    }
    return baseSeconds;
  }

  function saveState() {
    if (!storageKey) return;
    try {
      if (!running && baseSeconds === 0) {
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, JSON.stringify({ baseSeconds, startMs, running }));
      }
    } catch (e) { /* almacenamiento no disponible */ }
  }

  function loadState() {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function render() {
    const seconds = currentSeconds();
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    $(displayId).textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
    const ganado = (seconds / 3600) * tarifaHora;
    $(earningId).textContent = formatEarning({ h, m, s, ganado, pad });
  }

  function tick() {
    render();
  }

  function arrancar() {
    baseSeconds = currentSeconds();
    running = true;
    startMs = Date.now();
    clearInterval(interval);
    interval = setInterval(tick, 1000);
    $(displayId).classList.add('running');
    saveState();
  }

  function detener() {
    baseSeconds = currentSeconds();
    running = false;
    clearInterval(interval);
    interval = null;
    $(displayId).classList.remove('running');
  }

  function reset() {
    detener();
    baseSeconds = 0;
    startMs = 0;
    saveState();
  }

  function start() {
    if (running) return;
    arrancar();
    $(startId).textContent = '▶️ Corriendo';
    $(startId).disabled = true;
    $(pauseId).disabled = false;
    $(useId).disabled = false;
  }

  function pause() {
    if (!running) {
      arrancar();
      $(pauseId).textContent = '⏸️ Pausar';
      $(startId).disabled = true;
    } else {
      detener();
      render();
      $(pauseId).textContent = '▶️ Reanudar';
      saveState();
    }
  }

  function use() {
    const seconds = currentSeconds();
    if (seconds === 0) return;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    reset();
    $('h-horas').value = h;
    $('h-minutos').value = m;
    calcHoras();
    if (onFinish) onFinish();
    $(displayId).textContent = '00:00:00';
    $(earningId).textContent = '';
    $(startId).textContent = '▶️ Iniciar';
    $(startId).disabled = false;
    $(pauseId).textContent = '⏸️ Pausar';
    $(pauseId).disabled = true;
    $(useId).disabled = true;
  }

  // Restaura el estado guardado tras recargar/reabrir la app. Vuelve a poner
  // los botones y el intervalo en marcha si el cronómetro estaba corriendo.
  function restore() {
    const st = loadState();
    if (!st) return;
    baseSeconds = Number(st.baseSeconds) || 0;
    startMs = Number(st.startMs) || 0;
    running = false;
    if (st.running) {
      // Estaba corriendo: reanudamos usando la marca de tiempo original para
      // contar también el tiempo que la app estuvo cerrada/en segundo plano.
      running = true;
      clearInterval(interval);
      interval = setInterval(tick, 1000);
      $(displayId).classList.add('running');
      $(startId).textContent = '▶️ Corriendo';
      $(startId).disabled = true;
      $(pauseId).textContent = '⏸️ Pausar';
      $(pauseId).disabled = false;
      $(useId).disabled = false;
    } else if (baseSeconds > 0) {
      // Estaba pausado con tiempo acumulado.
      $(startId).disabled = true;
      $(pauseId).textContent = '▶️ Reanudar';
      $(pauseId).disabled = false;
      $(useId).disabled = false;
    }
    render();
  }

  return { start, pause, use, tick, restore, isRunning: () => running };
}

const cronoKmCtrl = crearCronometro({
  displayId: 'crono-km-display',
  earningId: 'crono-km-earning',
  startId: 'crono-km-start',
  pauseId: 'crono-km-pause',
  useId: 'crono-km-use',
  storageKey: 'crono-km-state',
  formatEarning: ({ h, m, ganado, pad }) => `Tiempo: ${pad(h)}h ${pad(m)}m — $${fmt(ganado)} por tiempo`,
  onFinish: () => switchTab('horas'),
});

const cronoCtrl = crearCronometro({
  displayId: 'crono-display',
  earningId: 'crono-earning',
  startId: 'crono-start',
  pauseId: 'crono-pause',
  useId: 'crono-use',
  storageKey: 'crono-state',
  formatEarning: ({ ganado }) => `Ganando: $${fmt(ganado)}`,
});

// Restaura el estado guardado de ambos cronómetros al cargar el script (tras
// recargar la página o reabrir la PWA después de que el sistema la cerrara).
cronoKmCtrl.restore();
cronoCtrl.restore();

// Wrappers globales para los onclick del HTML.
function cronoKmStart() { cronoKmCtrl.start(); }
function cronoKmPause() { cronoKmCtrl.pause(); }
function cronoKmUse() { cronoKmCtrl.use(); }
function cronoStart() { cronoCtrl.start(); }
function cronoPause() { cronoCtrl.pause(); }
function cronoUse() { cronoCtrl.use(); }

// Al volver a la app (o cuando la pestaña vuelve a ser visible) recalculamos
// el tiempo transcurrido a partir de la marca de tiempo real, porque el
// navegador congela/ralentiza setInterval mientras la página está en segundo plano.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    cronoKmCtrl.tick();
    cronoCtrl.tick();
  }
});

// pageshow cubre el caso del "back-forward cache" (bfcache) en móvil: cuando el
// navegador restaura la página desde caché no dispara visibilitychange, pero sí
// pageshow, así que forzamos un re-render con el tiempo real transcurrido.
window.addEventListener('pageshow', () => {
  cronoKmCtrl.tick();
  cronoCtrl.tick();
});
