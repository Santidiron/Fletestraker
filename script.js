let tarifaHora = 600;
let history = [];
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

function fmt(n) {
  return Math.round(n).toLocaleString('es-AR');
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const names = ['horas', 'km', 'historial'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (name === 'historial') renderHistory();
}

function openModal() {
  document.getElementById('modal-rate').value = tarifaHora;
  document.getElementById('overlay').classList.add('show');
}

function closeModal() {
  document.getElementById('overlay').classList.remove('show');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('overlay')) closeModal();
}

function saveRate() {
  const val = parseFloat(document.getElementById('modal-rate').value);
  if (!val || val <= 0) return;
  tarifaHora = val;
  document.querySelectorAll('.rate-display').forEach((el) => {
    el.textContent = fmt(val);
  });
  document.querySelectorAll('.rate-display-r').forEach((el) => {
    el.textContent = '$' + fmt(val);
  });
  document.getElementById('header-rate').textContent = fmt(val);
  closeModal();
  calcHoras();
  calcKm();
}

let cronoKmSeconds = 0;
let cronoKmInterval = null;
let cronoKmRunning = false;

function cronoKmTick() {
  cronoKmSeconds++;
  const h = Math.floor(cronoKmSeconds / 3600);
  const m = Math.floor((cronoKmSeconds % 3600) / 60);
  const s = cronoKmSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('crono-km-display').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const ganado = (cronoKmSeconds / 3600) * tarifaHora;
  document.getElementById('crono-km-earning').textContent = `Tiempo: ${pad(h)}h ${pad(m)}m — $${fmt(ganado)} por tiempo`;
}

function cronoKmStart() {
  if (cronoKmRunning) return;
  cronoKmRunning = true;
  cronoKmInterval = setInterval(cronoKmTick, 1000);
  document.getElementById('crono-km-display').classList.add('running');
  document.getElementById('crono-km-start').textContent = '▶️ Corriendo';
  document.getElementById('crono-km-start').disabled = true;
  document.getElementById('crono-km-pause').disabled = false;
  document.getElementById('crono-km-use').disabled = false;
}

function cronoKmPause() {
  if (!cronoKmRunning) {
    cronoKmRunning = true;
    cronoKmInterval = setInterval(cronoKmTick, 1000);
    document.getElementById('crono-km-display').classList.add('running');
    document.getElementById('crono-km-pause').textContent = '⏸️ Pausar';
    document.getElementById('crono-km-start').disabled = true;
  } else {
    cronoKmRunning = false;
    clearInterval(cronoKmInterval);
    document.getElementById('crono-km-display').classList.remove('running');
    document.getElementById('crono-km-pause').textContent = '▶️ Reanudar';
  }
}

function cronoKmUse() {
  if (cronoKmSeconds === 0) return;
  cronoKmRunning = false;
  clearInterval(cronoKmInterval);
  document.getElementById('crono-km-display').classList.remove('running');
  const h = Math.floor(cronoKmSeconds / 3600);
  const m = Math.floor((cronoKmSeconds % 3600) / 60);
  document.getElementById('k-horas').value = h;
  document.getElementById('k-minutos').value = m;
  calcKm();
  cronoKmSeconds = 0;
  document.getElementById('crono-km-display').textContent = '00:00:00';
  document.getElementById('crono-km-earning').textContent = '';
  document.getElementById('crono-km-start').textContent = '▶️ Iniciar';
  document.getElementById('crono-km-start').disabled = false;
  document.getElementById('crono-km-pause').textContent = '⏸️ Pausar';
  document.getElementById('crono-km-pause').disabled = true;
  document.getElementById('crono-km-use').disabled = true;
}

let cronoSeconds = 0;
let cronoInterval = null;
let cronoRunning = false;

function cronoTick() {
  cronoSeconds++;
  const h = Math.floor(cronoSeconds / 3600);
  const m = Math.floor((cronoSeconds % 3600) / 60);
  const s = cronoSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  document.getElementById('crono-display').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  const ganado = (cronoSeconds / 3600) * tarifaHora;
  document.getElementById('crono-earning').textContent = `Ganando: $${fmt(ganado)}`;
}

function cronoStart() {
  if (cronoRunning) return;
  cronoRunning = true;
  cronoInterval = setInterval(cronoTick, 1000);
  document.getElementById('crono-display').classList.add('running');
  document.getElementById('crono-start').textContent = '▶️ Corriendo';
  document.getElementById('crono-start').disabled = true;
  document.getElementById('crono-pause').disabled = false;
  document.getElementById('crono-use').disabled = false;
}

function cronoPause() {
  if (!cronoRunning) {
    cronoRunning = true;
    cronoInterval = setInterval(cronoTick, 1000);
    document.getElementById('crono-display').classList.add('running');
    document.getElementById('crono-pause').textContent = '⏸️ Pausar';
    document.getElementById('crono-start').disabled = true;
  } else {
    cronoRunning = false;
    clearInterval(cronoInterval);
    document.getElementById('crono-display').classList.remove('running');
    document.getElementById('crono-pause').textContent = '▶️ Reanudar';
  }
}

function cronoUse() {
  if (cronoSeconds === 0) return;
  cronoRunning = false;
  clearInterval(cronoInterval);
  document.getElementById('crono-display').classList.remove('running');
  const h = Math.floor(cronoSeconds / 3600);
  const m = Math.floor((cronoSeconds % 3600) / 60);
  document.getElementById('h-horas').value = h;
  document.getElementById('h-minutos').value = m;
  calcHoras();
  cronoSeconds = 0;
  document.getElementById('crono-display').textContent = '00:00:00';
  document.getElementById('crono-earning').textContent = '';
  document.getElementById('crono-start').textContent = '▶️ Iniciar';
  document.getElementById('crono-start').disabled = false;
  document.getElementById('crono-pause').textContent = '⏸️ Pausar';
  document.getElementById('crono-pause').disabled = true;
  document.getElementById('crono-use').disabled = true;
}

function calcHoras() {
  const horas = parseFloat(document.getElementById('h-horas').value) || 0;
  const mins = parseFloat(document.getElementById('h-minutos').value) || 0;
  const extra = parseFloat(document.getElementById('h-extra').value) || 0;
  const totalHoras = horas + mins / 60;
  const subtotal = totalHoras * tarifaHora;
  const total = subtotal + extra;
  const resDiv = document.getElementById('result-horas');
  if (totalHoras === 0 && extra === 0) {
    resDiv.classList.remove('show');
    return;
  }
  resDiv.classList.add('show');
  document.getElementById('rh-total').textContent = fmt(total);
  document.getElementById('rh-tiempo').textContent = `${horas}h ${Math.round(mins)}m`;
  document.getElementById('rh-subtotal').textContent = '$' + fmt(subtotal);
  document.getElementById('rh-extra').textContent = '$' + fmt(extra);
}

function calcKm() {
  const km = parseFloat(document.getElementById('k-km').value) || 0;
  const pKm = parseFloat(document.getElementById('k-precio-km').value) || 0;
  const horas = parseFloat(document.getElementById('k-horas').value) || 0;
  const mins = parseFloat(document.getElementById('k-minutos').value) || 0;
  const extra = parseFloat(document.getElementById('k-extra').value) || 0;
  const subKm = km * pKm;
  const totalH = horas + mins / 60;
  const subTiempo = totalH * tarifaHora;
  const total = subKm + subTiempo + extra;
  const resDiv = document.getElementById('result-km');
  if (km === 0 && totalH === 0 && extra === 0) {
    resDiv.classList.remove('show');
    return;
  }
  resDiv.classList.add('show');
  document.getElementById('rk-total').textContent = fmt(total);
  document.getElementById('rk-km').textContent = km + ' km';
  document.getElementById('rk-subtotal-km').textContent = pKm ? '$' + fmt(subKm) : '—';
  document.getElementById('rk-subtotal-tiempo').textContent = totalH > 0 ? '$' + fmt(subTiempo) : '—';
  document.getElementById('rk-extra').textContent = '$' + fmt(extra);
}

function saveAndReset(tipo) {
  let desc = '';
  let total = 0;
  if (tipo === 'horas') {
    const horas = parseFloat(document.getElementById('h-horas').value) || 0;
    const mins = parseFloat(document.getElementById('h-minutos').value) || 0;
    const extra = parseFloat(document.getElementById('h-extra').value) || 0;
    const subTotal = (horas + mins / 60) * tarifaHora;
    total = subTotal + extra;
    desc = `${horas}h ${Math.round(mins)}m trabajadas`;
    document.getElementById('h-horas').value = '';
    document.getElementById('h-minutos').value = '';
    document.getElementById('h-extra').value = '';
    document.getElementById('result-horas').classList.remove('show');
  } else {
    const km = parseFloat(document.getElementById('k-km').value) || 0;
    const pKm = parseFloat(document.getElementById('k-precio-km').value) || 0;
    const horas = parseFloat(document.getElementById('k-horas').value) || 0;
    const mins = parseFloat(document.getElementById('k-minutos').value) || 0;
    const extra = parseFloat(document.getElementById('k-extra').value) || 0;
    total = km * pKm + (horas + mins / 60) * tarifaHora + extra;
    desc = `${km} km recorridos`;
    document.getElementById('k-km').value = '';
    document.getElementById('k-precio-km').value = '';
    document.getElementById('k-horas').value = '';
    document.getElementById('k-minutos').value = '';
    document.getElementById('k-extra').value = '';
    document.getElementById('result-km').classList.remove('show');
  }
  if (total <= 0) return;
  history.unshift({ tipo, desc, total, fecha: new Date().toLocaleDateString('es-AR') });
  alert('✅ Guardado en historial: $' + fmt(total));
}

function renderHistory() {
  const list = document.getElementById('hist-list');
  const card = document.getElementById('hist-total-card');
  if (history.length === 0) {
    list.innerHTML = '<div class="hist-empty">Aún no hay registros guardados.</div>';
    card.style.display = 'none';
    return;
  }
  const grandTotal = history.reduce((s, h) => s + h.total, 0);
  document.getElementById('hist-grand-total').textContent = fmt(grandTotal);
  card.style.display = 'flex';
  list.innerHTML = history.map((h) => `
    <div class="hist-item">
      <div class="hi-left">
        <div class="hi-type">${h.tipo === 'horas' ? '⏱️ Horas' : '📍 Km'}</div>
        <div class="hi-desc">${h.desc} · ${h.fecha}</div>
      </div>
      <div class="hi-amount">$${fmt(h.total)}</div>
    </div>
  `).join('');
}

function clearHistory() {
  if (history.length === 0) return;
  if (confirm('¿Borrar todo el historial?')) {
    history = [];
    renderHistory();
  }
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

document.addEventListener('DOMContentLoaded', () => {
  const installButton = document.getElementById('install-pwa-btn');
  if (installButton) {
    installButton.addEventListener('click', installPwa);
  }
  calcHoras();
  calcKm();
  renderHistory();
});
