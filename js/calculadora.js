/* ============================================================
   Navegación por pestañas y cálculo de tarifas (horas y km).
   ============================================================ */

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t, i) => {
    const names = ['horas', 'km', 'historial', 'metricas'];
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (name === 'historial') renderHistory();
  if (name === 'metricas') loadMetricasClientes();
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
