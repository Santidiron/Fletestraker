/* ============================================================
   Guardado de cobros (fletes) e historial.
   ============================================================ */

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
    alert('✅ Flete guardado $' + fmt(total));
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
    if (!confirm('¿Borrar TODO el historial? Esta acción no se puede deshacer.')) return;
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
