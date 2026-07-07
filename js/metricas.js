/* ============================================================
   Métricas por cliente (vista metricas_clientes).
   ============================================================ */

async function loadMetricasClientes() {
  const list = document.getElementById('metricas-list');
  if (!window.FletesDB || !currentUser) {
    list.innerHTML = '<div class="hist-empty">Iniciá sesión para ver las métricas.</div>';
    return;
  }
  list.innerHTML = '<div class="hist-empty">Cargando…</div>';
  try {
    const rows = await FletesDB.getMetricasClientes();
    const conFletes = rows.filter((r) => Number(r.total_fletes) > 0);
    if (conFletes.length === 0) {
      list.innerHTML = '<div class="hist-empty">Todavía no hay fletes finalizados para mostrar métricas.</div>';
      return;
    }
    list.innerHTML = conFletes.map((r) => {
      const ultimo = r.ultimo_flete
        ? new Date(r.ultimo_flete).toLocaleDateString('es-AR')
        : '—';
      return `
        <div class="metrica-item">
          <div class="metrica-head">
            <span class="metrica-nombre">${escapeHtml(r.nombre)}</span>
            <span class="metrica-total">$${fmt(r.total_facturado)}</span>
          </div>
          <div class="metrica-stats">
            <div><span class="ms-label">Fletes</span><span class="ms-value">${r.total_fletes}</span></div>
            <div><span class="ms-label">Ticket prom.</span><span class="ms-value">$${fmt(r.ticket_promedio)}</span></div>
            <div><span class="ms-label">Último</span><span class="ms-value">${ultimo}</span></div>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    console.error('No se pudieron cargar las métricas:', e);
    list.innerHTML = '<div class="hist-empty">No se pudieron cargar las métricas.</div>';
  }
}
