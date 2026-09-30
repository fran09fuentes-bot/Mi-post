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

  } catch (err) {
    console.error("Error en cargarDatosGlobales:", err);
  }
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
    const totalVenta = subtotal - descuento;
    
    const gananciaBruta = (precioUnitario - costoUnitario) * cantidad - descuento;
    const reinversion = costoUnitario * cantidad;

    const { error: errVenta } = await _supabase
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
          costo: reinversion,
          metodo_pago: metodoPago,
          detalles_productos: [
            {
              id: productoSeleccionado.id,
              nombre: productoSeleccionado.nombre,
              cantidad: cantidad,
              precio: precioUnitario,
              total: totalVenta
            }
          ],
          fecha: new Date().toISOString()
        }
      ]);

    if (errVenta) throw errVenta;

    if (productoSeleccionado.stock !== null && productoSeleccionado.stock !== undefined) {
      const nuevoStock = Math.max(0, productoSeleccionado.stock - cantidad);
      await _supabase
        .from('productos')
        .update({ stock: nuevoStock })
        .eq('id', productoSeleccionado.id);
    }

    alert('¡Venta registrada con éxito!');
    await cargarDatosGlobales();

  } catch (error) {
    console.error('Error al registrar venta:', error);
    alert('Error al registrar venta: ' + error.message);
  }
}

// Función global para eliminar ventas
async function eliminarVenta(id) {
  if (!_supabase) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  if (confirm('¿Deseas eliminar esta venta? El stock será devuelto al inventario.')) {
    try {
      const ventaAEliminar = (window.ventas || []).find(v => v.id === id);

      const { error } = await _supabase
        .from('ventas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (ventaAEliminar && ventaAEliminar.producto_id) {
        const prod = (window.productos || []).find(p => p.id === ventaAEliminar.producto_id);
        if (prod && prod.stock !== null && prod.stock !== undefined) {
          const cantidadDevuelta = ventaAEliminar.cantidad || 1;
          await _supabase
            .from('productos')
            .update({ stock: prod.stock + cantidadDevuelta })
            .eq('id', prod.id);
        }
      }

      alert('Venta eliminada y stock devuelto.');
      await cargarDatosGlobales();

      if (typeof renderHistorial === 'function') {
        renderHistorial();
      }
    } catch (err) {
      console.error('Error al eliminar venta:', err);
      alert('Error al eliminar venta: ' + err.message);
    }
  }
}

window.cargarDatosGlobales = cargarDatosGlobales;
window.registrarVenta = registrarVenta;
window.eliminarVenta = eliminarVenta;

document.addEventListener('DOMContentLoaded', () => {
  cargarDatosGlobales();
});
