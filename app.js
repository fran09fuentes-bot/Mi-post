// Configuración de Supabase
const SUPABASE_URL = 'https://cdwvzbugtrxsgefzpadz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gWOLb2P47i8qiQuSAnAldA_54neh6U7';

let _supabase;
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

// Función para obtener la fecha local en formato YYYY-MM-DD sin errores de UTC
function obtenerFechaLocal() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset() * 60000;
  return new Date(hoy.getTime() - offset).toISOString().split('T')[0];
}

// Función para cargar todos los datos globales desde Supabase
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
    else window.cierres = crrs || [];

    // Refrescar vistas si las funciones existen en la página actual
    if (typeof calcularBalanceCaja === 'function') calcularBalanceCaja();
    if (typeof renderCierres === 'function') renderCierres();
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderGridProductos === 'function') renderGridProductos();
    if (typeof actualizarMetricasUI === 'function') actualizarMetricasUI();
    if (typeof renderGastos === 'function') renderGastos();
    if (typeof renderListaGastos === 'function') renderListaGastos();

  } catch (err) {
    console.error("Error en cargarDatosGlobales:", err);
  }
}

// Función para filtrar productos localmente por nombre
function buscarProductos(termino = '') {
  if (!termino.trim()) return window.productos || [];
  const query = termino.toLowerCase().trim();
  return (window.productos || []).filter(p => 
    (p.nombre && p.nombre.toLowerCase().includes(query)) ||
    (p.producto && p.producto.toLowerCase().includes(query))
  );
}

// Función global para registrar ventas
async function registrarVenta(productoSeleccionado, cantidad, metodoPago = 'Efectivo', descuento = 0) {
  if (!_supabase) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  if (productoSeleccionado.stock !== null && productoSeleccionado.stock !== undefined) {
    if (productoSeleccionado.stock < cantidad) {
      alert(`Stock insuficiente. Quedan ${productoSeleccionado.stock} unidades de ${productoSeleccionado.nombre}.`);
      return;
    }
  }

  try {
    const precioUnitario = Number(productoSeleccionado.precio) || 0;
    const costoUnitario = Number(productoSeleccionado.costo) || 0;
    
    const subtotal = precioUnitario * cantidad;
    const totalVenta = Math.max(0, subtotal - descuento);
    
    const gananciaBruta = (precioUnitario - costoUnitario) * cantidad - descuento;
    const reinversion = costoUnitario * cantidad;

    const { error: errVenta } = await
