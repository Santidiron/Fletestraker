/* ============================================================
   Conexión con Supabase (PostgreSQL)
   La "publishable key" es segura de incluir en el cliente.
   El acceso real a los datos lo controla RLS + el login.
   ============================================================ */
const SUPABASE_URL = 'https://acnsxnbeudlacpnxnvas.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wtfjvHA6wjE3RYj4POdPDw_Y1KEaFhD';

// El SDK se carga por CDN y expone el global `supabase`.
// Si no está disponible (por ejemplo sin conexión), la app sigue
// funcionando como calculadora local sin guardado en la nube.
if (typeof supabase === 'undefined' || !supabase.createClient) {
  console.warn('SDK de Supabase no disponible. La app funcionará en modo local.');
} else {
  const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

  window.FletesDB = {
    client: _sb,

    /* ---------------- AUTENTICACIÓN ---------------- */
    async getSession() {
      const { data } = await _sb.auth.getSession();
      return data.session;
    },
    onAuthChange(callback) {
      _sb.auth.onAuthStateChange((_event, session) => callback(session));
    },
    signIn(email, password) {
      return _sb.auth.signInWithPassword({ email, password });
    },
    signUp(email, password) {
      return _sb.auth.signUp({ email, password });
    },
    signOut() {
      return _sb.auth.signOut();
    },
    async getUser() {
      const { data } = await _sb.auth.getUser();
      return data.user;
    },

    /* ---------------- TRANSPORTISTAS ----------------
       fletes.transportista_id es NOT NULL. Como no gestionamos
       transportistas desde la UI, garantizamos que exista uno y
       lo reutilizamos para todos los fletes. */
    async ensureTransportista() {
      const { data, error } = await _sb
        .from('transportistas')
        .select('id')
        .eq('activo', true)
        .order('created_at', { ascending: true })
        .limit(1);
      if (error) throw error;
      if (data && data.length) return data[0].id;

      const user = await this.getUser();
      const nombre = (user && user.email ? user.email.split('@')[0] : 'Fletero');
      const { data: creado, error: err2 } = await _sb
        .from('transportistas')
        .insert({ nombre })
        .select('id')
        .single();
      if (err2) throw err2;
      return creado.id;
    },

    /* ---------------- TARIFAS ---------------- */
    async getTarifaActiva() {
      const { data, error } = await _sb
        .from('tarifas')
        .select('*')
        .eq('activa', true)
        .order('vigente_desde', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data && data.length ? data[0] : null;
    },
    async setTarifaHora(precioPorHora) {
      // Desactiva la tarifa vigente y crea una nueva activa.
      await _sb.from('tarifas').update({ activa: false }).eq('activa', true);
      const { data, error } = await _sb
        .from('tarifas')
        .insert({
          nombre: 'Tarifa ' + new Date().getFullYear(),
          precio_base: 0,
          precio_por_hora: precioPorHora,
          activa: true,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },

    /* ---------------- CLIENTES ---------------- */
    async listClientes() {
      const { data, error } = await _sb
        .from('clientes')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    async createCliente(nombre, telefono) {
      const { data, error } = await _sb
        .from('clientes')
        .insert({ nombre, telefono: telefono || null })
        .select('id, nombre')
        .single();
      if (error) throw error;
      return data;
    },

    /* ---------------- FLETES ---------------- */
    async insertFlete(flete) {
      const { data, error } = await _sb
        .from('fletes')
        .insert(flete)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    async listFletes(limit = 100) {
      const { data, error } = await _sb
        .from('fletes')
        .select('id, valor, notas, estado, fecha_fin, created_at, clientes(nombre)')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    async deleteAllFletes() {
      const { error } = await _sb.from('fletes').delete().neq('id', EMPTY_UUID);
      if (error) throw error;
    },
  };
}
