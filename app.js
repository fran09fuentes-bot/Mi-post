// Configuración de Supabase
const SUPABASE_URL = 'https://cdwvzbugtrxsgefzpadz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gWOLb2P47i8qiQuSAnAldA_54neh6U7';

let _supabase = null;

if (window.supabase && typeof window.supabase.createClient === 'function') {
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error("Librería de Supabase no encontrada");
}

window._supabase = _supabase;
window.supabaseClient = _supabase;

window.productos = [];
window.ventas = [];
window.gastos = [];
window.cierres = [];
window.compras = []; // Arreglo global para compras de inventario

// Función para obtener la fecha local en formato YYYY-MM-DD sin desfase UTC
function obtenerFechaLocal() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset() * 60000;
  return new Date(hoy.getTime() - offset).toISOString().split('T')[0];
}

// Cargar todos los datos desde Supabase y refrescar las vistas
async function cargarDatosGlobales() {
  if (!_supabase) return;

  try {
    const { data: prods, error: errProds } = await _supabase.from('productos').select('*');
    if (errProds) console.error("Error al cargar productos:", errProds);
    else window.productos = prods || [];

    const { data: vts, error: errVts } = await _supabase.from('ventas').select('*');
    if (errVts) console.error("Error al cargar ventas:", errVts);
    else window.ventas = vts || [];

    const { data: gsts, error: errGsts } = await _supabase.from('gastos').select('*');
    if (errGsts) console.error("Error al cargar gastos:", errGsts);
    else window.gastos = gsts || [];

    const { data: crrs, error: errCrrs } = await _supabase.from('cierres').select('*').order('created_at', { ascending: false });
    if (errCrrs) console.error("Error al cargar cierres:", errCrrs);
