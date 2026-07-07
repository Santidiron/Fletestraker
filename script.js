let tarifaHora = 600;
let history = [];
let deferredPrompt = null;

// ---- Estado de la conexión con Supabase ----
let currentUser = null;
let transportistaId = null;
let tarifaActivaId = null;
let clientes = [];
let pendingFlete = null;
let authMode = 'signin';
let appBooted = false;

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
  applyRate(val);
  closeModal();
  if (window.FletesDB && currentUser) {
    FletesDB.setTarifaHora(val)
      .then((t) => { tarifaActivaId = t.id; })
      .catch((e) => console.error('No se pudo guardar la tarifa:', e));
  }
}

function applyRate(val) {
  tarifaHora = val;
  document.querySelectorAll('.rate-display').forEach((el) => {
    el.textContent = fmt(val);
  });
  document.querySelectorAll('.rate-display-r').forEach((el) => {
    el.textContent = '$' + fmt(val);
  });
  document.getElementById('header-rate').textContent = fmt(val);
  document.getElementById('modal-rate').value = val;
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
  document.getElementById('h-horas').value = h;
  document.getElementById('h-minutos').value = m;
  calcHoras();
  switchTab('horas');
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
  let minutos = 0;
  if (tipo === 'horas') {
    const horas = parseFloat(document.getElementById('h-horas').value) || 0;
    const mins = parseFloat(document.getElementById('h-minutos').value) || 0;
    const extra = parseFloat(document.getElementById('h-extra').value) || 0;
    const subTotal = (horas + mins / 60) * tarifaHora;
    total = subTotal + extra;
    desc = `${horas}h ${Math.round(mins)}m trabajadas`;
    minutos = horas * 60 + mins;
  } else {
    const km = parseFloat(document.getElementById('k-km').value) || 0;
    const pKm = parseFloat(document.getElementById('k-precio-km').value) || 0;
    const horas = parseFloat(document.getElementById('k-horas').value) || 0;
    const mins = parseFloat(document.getElementById('k-minutos').value) || 0;
    const extra = parseFloat(document.getElementById('k-extra').value) || 0;
    total = km * pKm + (horas + mins / 60) * tarifaHora + extra;
    desc = `${km} km recorridos`;
    minutos = horas * 60 + mins;
  }
  if (total <= 0) return;
  pendingFlete = { tipo, desc, total, minutos };

  // Sin conexión a la base: se guarda solo localmente (como antes).
  if (!window.FletesDB || !currentUser) {
    history.unshift({ tipo, desc, total, fecha: new Date().toLocaleDateString('es-AR') });
    clearInputs(tipo);
    pendingFlete = null;
    alert('✅ Guardado localmente: $' + fmt(total));
    return;
  }
  openSaveModal();
}

function clearInputs(tipo) {
  if (tipo === 'horas') {
    document.getElementById('h-horas').value = '';
    document.getElementById('h-minutos').value = '';
    document.getElementById('h-extra').value = '';
    document.getElementById('result-horas').classList.remove('show');
  } else {
    document.getElementById('k-km').value = '';
    document.getElementById('k-precio-km').value = '';
    document.getElementById('k-horas').value = '';
    document.getElementById('k-minutos').value = '';
    document.getElementById('k-extra').value = '';
    document.getElementById('result-km').classList.remove('show');
  }
}

function openSaveModal() {
  document.getElementById('save-total').textContent = fmt(pendingFlete.total);
  const sel = document.getElementById('save-cliente');
  sel.innerHTML =
    clientes.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('') +
    '<option value="__new__">➕ Nuevo cliente…</option>';
  sel.onchange = toggleNewCliente;
  document.getElementById('new-cliente-nombre').value = '';
  toggleNewCliente();
  document.getElementById('save-error').textContent = '';
  document.getElementById('save-overlay').classList.add('show');
}

function toggleNewCliente() {
  const sel = document.getElementById('save-cliente');
  const isNew = sel.value === '__new__';
  document.getElementById('new-cliente-field').style.display = isNew ? 'block' : 'none';
}

function closeSaveModal() {
  document.getElementById('save-overlay').classList.remove('show');
}

function closeSaveOutside(e) {
  if (e.target === document.getElementById('save-overlay')) closeSaveModal();
}

async function confirmSaveFlete() {
  if (!pendingFlete) return;
  const btn = document.getElementById('save-confirm-btn');
  const errEl = document.getElementById('save-error');
  errEl.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Guardando…';
  try {
    const sel = document.getElementById('save-cliente');
    let clienteId = sel.value;
    if (clienteId === '__new__') {
      const nombre = document.getElementById('new-cliente-nombre').value.trim();
      if (!nombre) {
        errEl.textContent = 'Ingresá el nombre del cliente.';
        return;
      }
      const nuevo = await FletesDB.createCliente(nombre);
      clientes.push({ id: nuevo.id, nombre: nuevo.nombre });
      clientes.sort((a, b) => a.nombre.localeCompare(b.nombre));
      clienteId = nuevo.id;
    }
    if (!clienteId) {
      errEl.textContent = 'Elegí o creá un cliente.';
      return;
    }
    if (!transportistaId) transportistaId = await FletesDB.ensureTransportista();

    const fin = new Date();
    const inicio = new Date(fin.getTime() - pendingFlete.minutos * 60000);
    const flete = {
      cliente_id: clienteId,
      transportista_id: transportistaId,
      tarifa_id: tarifaActivaId || null,
      fecha_inicio: inicio.toISOString(),
      fecha_fin: fin.toISOString(),
      estado: 'finalizado',
      valor: pendingFlete.total,
      notas: JSON.stringify({
        tipo: pendingFlete.tipo,
        desc: pendingFlete.desc,
      }),
    };
    await FletesDB.insertFlete(flete);
    clearInputs(pendingFlete.tipo);
    pendingFlete = null;
    closeSaveModal();
    await loadHistoryFromDb();
    switchTab('historial');
  } catch (e) {
    console.error('Error al guardar el flete:', e);
    errEl.textContent = 'No se pudo guardar: ' + (e.message || e);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar';
  }
}

async function loadHistoryFromDb() {
  try {
    const rows = await FletesDB.listFletes();
    history = rows.map((r) => {
      let meta = {};
      try { meta = JSON.parse(r.notas || '{}'); } catch (_) { /* notas no-JSON */ }
      const total = r.valor != null ? Number(r.valor) : (meta.total != null ? meta.total : 0);
      return {
        tipo: meta.tipo || 'horas',
        desc: meta.desc || 'Flete',
        total,
        fecha: new Date(r.fecha_fin || r.created_at).toLocaleDateString('es-AR'),
        cliente: (r.clientes && r.clientes.nombre) || '',
      };
    });
  } catch (e) {
    console.error('No se pudo cargar el historial:', e);
    history = [];
  }
  renderHistory();
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
        ${h.cliente ? `<div class="hi-cliente">${escapeHtml(h.cliente)}</div>` : ''}
        <div class="hi-desc">${escapeHtml(h.desc)} · ${escapeHtml(h.fecha)}</div>
      </div>
      <div class="hi-amount">$${fmt(h.total)}</div>
    </div>
  `).join('');
}

async function clearHistory() {
  if (history.length === 0) return;
  if (window.FletesDB && currentUser) {
    if (!confirm('¿Borrar TODO el historial de la base de datos? Esta acción no se puede deshacer.')) return;
    try {
      await FletesDB.deleteAllFletes();
      await loadHistoryFromDb();
    } catch (e) {
      alert('No se pudo borrar: ' + (e.message || e));
    }
    return;
  }
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

/* ============================================================
   AUTENTICACIÓN (Supabase Auth)
   ============================================================ */
function showAuth(show) {
  document.getElementById('auth-overlay').classList.toggle('show', show);
  const logout = document.getElementById('logout-btn');
  if (logout) logout.style.display = show ? 'none' : 'inline-block';
}

function toggleAuthMode(e) {
  if (e) e.preventDefault();
  authMode = authMode === 'signin' ? 'signup' : 'signin';
  const isSignin = authMode === 'signin';
  document.getElementById('auth-title').textContent = isSignin ? 'Iniciar sesión' : 'Crear cuenta';
  document.getElementById('auth-sub').textContent = isSignin
    ? 'Ingresá para guardar tus cobros en la nube.'
    : 'Creá una cuenta para empezar a guardar tus cobros.';
  document.getElementById('auth-submit').textContent = isSignin ? 'Iniciar sesión' : 'Crear cuenta';
  document.getElementById('auth-switch-text').textContent = isSignin ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?';
  document.getElementById('auth-switch-link').textContent = isSignin ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('auth-error').textContent = '';
}

async function authSubmit() {
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-error');
  const btn = document.getElementById('auth-submit');
  errEl.textContent = '';
  if (!email || !password) {
    errEl.textContent = 'Completá email y contraseña.';
    return;
  }
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Procesando…';
  try {
    const res = authMode === 'signin'
      ? await FletesDB.signIn(email, password)
      : await FletesDB.signUp(email, password);
    if (res.error) {
      errEl.textContent = traducirAuthError(res.error.message);
      return;
    }
    if (authMode === 'signup' && !res.data.session) {
      errEl.textContent = '✅ Cuenta creada. Revisá tu email para confirmarla y luego iniciá sesión.';
      authMode = 'signup';
      toggleAuthMode();
      return;
    }
    // El listener onAuthChange se encarga de arrancar la app.
  } catch (e) {
    errEl.textContent = 'Error de conexión: ' + (e.message || e);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

function traducirAuthError(msg) {
  if (/invalid login credentials/i.test(msg)) return 'Email o contraseña incorrectos.';
  if (/email not confirmed/i.test(msg)) return 'Tenés que confirmar tu email antes de ingresar.';
  if (/user already registered/i.test(msg)) return 'Ese email ya está registrado. Iniciá sesión.';
  if (/password should be at least/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  return msg;
}

async function doLogout() {
  if (!window.FletesDB) return;
  await FletesDB.signOut();
}

async function bootApp(session) {
  currentUser = session.user;
  showAuth(false);
  try {
    transportistaId = await FletesDB.ensureTransportista();
    const tarifa = await FletesDB.getTarifaActiva();
    if (tarifa) {
      tarifaActivaId = tarifa.id;
      const precio = Number(tarifa.precio_por_hora);
      if (precio > 0) applyRate(precio);
    }
    clientes = await FletesDB.listClientes();
    await loadHistoryFromDb();
  } catch (e) {
    console.error('Error al iniciar la app:', e);
  }
}

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
