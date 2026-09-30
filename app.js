// CONFIGURACIÓN DE SUPABASE
const SUPABASE_URL = 'https://cdwvzbugtrxsgefzpadz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gWOLb2P47i8qiQuSAnAldA_54neh6U7';

// Inicialización del cliente de Supabase
let _supabase;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} else {
  console.error("Librería de Supabase no encontrada en el HTML");
}

// Para asegurar compatibilidad en todas las páginas
window._supabase = _supabase;
window.supabaseClient = _supabase;

// Variables Globales
window.productos = [];
window.ventas = [];
window.gastos = [];

// CARGAR DATOS GLOBALES
async function cargarDatosGlobales() {
  if (!_supabase) return;

  try {
    // 1. Cargar productos
    const { data: prods, error: errProds } = await _supabase
      .from('productos')
      .select('*');
    if (errProds) console.error("Error al cargar productos:", errProds);
    else window.productos = prods || [];

    // 2. Cargar ventas
    const { data: vts, error: errVts } = await _supabase
      .from('ventas')
      .select('*');
    if (errVts) console.error("Error al cargar ventas:", errVts);
    else window.ventas = vts || [];

    // 3. Cargar gastos
    const { data: gsts, error: errGsts } = await _supabase
      .from('gastos')
      .select('*');
    if (errGsts) console.error("Error al cargar gastos:", errGsts);
    else window.gastos = gsts || [];

  } catch (err) {
    console.error("Error global en cargarDatosGlobales:", err);
  }
}

// REGISTRAR VENTA (Corregido con fecha ISO limpia)
async function registrarVenta(productoSeleccionado, cantidad, descuento = 0) {
  if (!_supabase) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  try {
    const precioUnitario = Number(productoSeleccionado.precio) || 0;
    const costoUnitario = Number(productoSeleccionado.costo) || 0;
    
    const subtotal = precioUnitario * cantidad;
    const totalVenta = subtotal - descuento;
    
    const gananciaBruta = (precioUnitario - costoUnitario) * cantidad - descuento;
    const reinversion = costoUnitario * cantidad;

    const { error } = await _supabase
      .from('ventas')
      .insert([
        {
          cliente: 'Cliente General',
          producto: productoSeleccionado.nombre,
          producto_id: productoSeleccionado.id,
          cantidad: cantidad,
          precio: precioUnitario,
          descuento: descuento,
          total: totalVenta,
          ingreso: totalVenta,
          gananciaBruta: gananciaBruta,
          ganancia_bruta: gananciaBruta,
          gananciaNeta: gananciaBruta,
          ganancia_neta: gananciaBruta,
          reinversion: reinversion,
          detalles_productos: [
            {
              id: productoSeleccionado.id,
              nombre: productoSeleccionado.nombre,
              cantidad: cantidad,
              precio: precioUnitario,
              total: totalVenta
            }
          ],
          // ✅ FECHA EN FORMATO ISO ESTÁNDAR (Elimina el error de "p.m.")
          fecha: new Date().toISOString()
        }
      ]);

    if (error) throw error;

    alert('¡Venta registrada con éxito!');
    await cargarDatosGlobales();

  } catch (error) {
    console.error('Error al registrar venta:', error);
    alert('Error al registrar venta en Supabase: ' + error.message);
  }
}

// Cargar datos automáticamente al iniciar cualquier página
document.addEventListener('DOMContentLoaded', () => {
  cargarDatosGlobales();
});
// ELIMINAR VENTA
async function eliminarVenta(id) {
  if (!_supabase) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  if (confirm('¿Estás seguro de que deseas eliminar esta venta registrada?')) {
    try {
      const { error } = await _supabase
        .from('ventas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Venta eliminada con éxito.');
      await cargarDatosGlobales();

      // Si existe la función de renderizado en la página actual, la ejecutamos
      if (typeof renderHistorial === 'function') {
        renderHistorial();
      }
    } catch (err) {
      console.error('Error al eliminar venta:', err);
      alert('Error al eliminar venta: ' + err.message);
    }
  }
}
