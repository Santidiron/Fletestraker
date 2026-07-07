/* ============================================================
   Autenticación con Supabase Auth y arranque de la sesión.
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

function togglePassword() {
  const input = document.getElementById('auth-password');
  const btn = document.getElementById('toggle-password');
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁️';
  btn.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
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
