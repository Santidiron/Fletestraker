/* ============================================================
   Estado compartido de la app y utilidades generales.
   Debe cargarse antes que el resto de los módulos.
   ============================================================ */

// ---- Tarifa y datos en memoria ----
let tarifaHora = 600;
let history = [];

// ---- Estado de la conexión con Supabase ----
let currentUser = null;
let transportistaId = null;
let tarifaActivaId = null;
let clientes = [];
let pendingFlete = null;
let authMode = 'signin';
let appBooted = false;

/** Formatea un número como moneda local (redondeando hacia arriba). */
function fmt(n) {
  return Math.ceil(n).toLocaleString('es-AR');
}

/** Escapa texto para insertarlo de forma segura en HTML. */
function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
