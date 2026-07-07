/* ============================================================
   Edición de la tarifa por hora (modal).
   ============================================================ */

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

/** Aplica la tarifa en la UI (sin persistir). */
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
