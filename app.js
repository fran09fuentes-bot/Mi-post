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

    // Refrescar vistas si las funciones existen
    if (typeof calcularBalanceCaja === 'function') calcularBalanceCaja();
    if (typeof renderCierres === 'function') renderCierres();

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

// ==========================================
// MÓDULO MEJORADO DE CONTROL DE CAJA
// ==========================================

// Calcula dinámicamente el balance diario de caja
function calcularBalanceCaja() {
  const fechaHoy = obtenerFechaLocal();
  
  const lblFecha = document.getElementById('caja-fecha-hoy');
  if (lblFecha) lblFecha.innerText = fechaHoy;

  const inputBase = document.getElementById('caja-base-input');
  const base = parseFloat(inputBase ? inputBase.value : 10) || 0;

  // Filtrar ventas del día actual
  const ventasHoy = (window.ventas || []).filter(v => (v.fecha || '').startsWith(fechaHoy));
  
  let ventasEfectivo = 0;
  let ventasTransferencia = 0;
  let ventasTarjeta = 0;

  ventasHoy.forEach(v => {
    const metodo = (v.metodo_pago || 'Efectivo').toLowerCase();
    const monto = parseFloat(v.total || v.ingreso) || 0;

    if (metodo.includes('transfer') || metodo.includes('chivo')) {
      ventasTransferencia += monto;
    } else if (metodo.includes('tarjeta')) {
      ventasTarjeta += monto;
    } else {
      ventasEfectivo += monto;
    }
  });

  // Filtrar gastos pagados en efectivo del día actual
  const gastosHoy = (window.gastos || []).filter(g => (g.fecha || '').startsWith(fechaHoy));
  const gastosEfectivo = gastosHoy.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);

  const efectivoEsperado = base + ventasEfectivo - gastosEfectivo;
  const totalGeneral = ventasEfectivo + ventasTransferencia + ventasTarjeta;

  // Actualizar elementos DOM si existen
  const elBase = document.getElementById('bal-base');
  if (elBase) elBase.innerText = `$${base.toFixed(2)}`;

  const elVentasEfectivo = document.getElementById('bal-ventas-efectivo');
  if (elVentasEfectivo) elVentasEfectivo.innerText = `$${ventasEfectivo.toFixed(2)}`;

  const elGastosEfectivo = document.getElementById('bal-gastos-efectivo');
  if (elGastosEfectivo) elGastosEfectivo.innerText = `$${gastosEfectivo.toFixed(2)}`;

  const elEfectivoEsperado = document.getElementById('bal-efectivo-esperado');
  if (elEfectivoEsperado) elEfectivoEsperado.innerText = `$${efectivoEsperado.toFixed(2)}`;

  const elTrans = document.getElementById('bal-transferencias');
  if (elTrans) elTrans.innerText = `$${ventasTransferencia.toFixed(2)}`;

  const elTarj = document.getElementById('bal-tarjeta');
  if (elTarj) elTarj.innerText = `$${ventasTarjeta.toFixed(2)}`;

  const elTotalGen = document.getElementById('bal-total-general');
  if (elTotalGen) elTotalGen.innerText = `$${totalGeneral.toFixed(2)}`;

  actualizarDiferenciaCierre();
}

// Muestra en tiempo real la diferencia (Sobrante / Faltante / Cuadrado)
function actualizarDiferenciaCierre() {
  const inputContado = document.getElementById('caja-contado-input');
  const box = document.getElementById('box-diferencia-cierre');
  const lbl = document.getElementById('lbl-diferencia-cierre');

  if (!inputContado || !box || !lbl) return;

  if (!inputContado.value) {
    box.className = 'alert alert-secondary d-flex justify-content-between align-items-center mb-3 py-2 px-3';
    lbl.innerText = 'Ingresa el monto contado';
    return;
  }

  const elEsperado = document.getElementById('bal-efectivo-esperado');
  const esperado = parseFloat(elEsperado ? elEsperado.innerText.replace('$', '') : 0) || 0;
  const contado = parseFloat(inputContado.value) || 0;
  const diff = contado - esperado;

  if (Math.abs(diff) < 0.009) {
    box.className = 'alert alert-success d-flex justify-content-between align-items-center mb-3 py-2 px-3';
    lbl.innerHTML = '¡Caja perfectamente cuadrada! ($0.00)';
  } else if (diff > 0) {
    box.className = 'alert alert-warning d-flex justify-content-between align-items-center mb-3 py-2 px-3';
    lbl.innerHTML = `Sobrante: +$${diff.toFixed(2)}`;
  } else {
    box.className = 'alert alert-danger d-flex justify-content-between align-items-center mb-3 py-2 px-3';
    lbl.innerHTML = `Faltante: -$${Math.abs(diff).toFixed(2)}`;
  }
}

// Función global para registrar el cierre de caja
async function registrarCierreCaja(efectivoBase, efectivoEsperado, efectivoContado) {
  if (!_supabase) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  try {
    const fechaHoy = obtenerFechaLocal();
    const base = parseFloat(efectivoBase) || 0;
    const esperado = parseFloat(efectivoEsperado) || 0;
    const contado = parseFloat(efectivoContado) || 0;
    const diferencia = contado - esperado;

    const { error } = await _supabase
      .from('cierres')
      .insert([
        {
          fecha: fechaHoy,
          efectivo_base: base,
          efectivo_esperado: esperado,
          efectivo_contado: contado,
          diferencia: diferencia
        }
      ]);

    if (error) throw error;

    alert('¡Cierre de caja guardado con éxito!');
    await cargarDatosGlobales();

  } catch (err) {
    console.error('Error al registrar cierre de caja:', err);
    alert('Error al registrar cierre de caja: ' + err.message);
  }
}

// Renderiza la lista del historial de cierres guardados
function renderCierres() {
  const contenedor = document.getElementById('lista-cierres-guardados');
  if (!contenedor) return;

  const cierres = window.cierres || [];

  if (cierres.length === 0) {
    contenedor.innerHTML = '<div class="text-muted small">No hay cierres registrados aún.</div>';
    return;
  }

  contenedor.innerHTML = cierres.map(c => {
    const esperado = parseFloat(c.efectivo_esperado) || 0;
    const contado = parseFloat(c.efectivo_contado) || 0;
    const diff = c.diferencia !== undefined ? parseFloat(c.diferencia) : (contado - esperado);

    let statusBadge = '<span class="badge bg-success">Cuadrado</span>';
    if (diff > 0.009) statusBadge = `<span class="badge bg-warning text-dark">Sobrante (+$${diff.toFixed(2)})</span>`;
    if (diff < -0.009) statusBadge = `<span class="badge bg-danger">Faltante (-$${Math.abs(diff).toFixed(2)})</span>`;

    return `
      <div class="p-3 bg-light rounded-3 d-flex justify-content-between align-items-center border mb-2">
        <div>
          <div class="fw-bold">${c.fecha || 'Sin fecha'} ${statusBadge}</div>
          <small class="text-muted">Esperado: $${esperado.toFixed(2)} | Contado: $${contado.toFixed(2)}</small>
        </div>
        <div class="d-flex align-items-center gap-3">
          <span class="fw-bold fs-5">$${contado.toFixed(2)}</span>
          ${c.id ? `<button class="btn btn-sm btn-outline-danger" onclick="eliminarCierre('${c.id}')"><i class="bi bi-trash"></i></button>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Función global para eliminar cierres de caja guardados
async function eliminarCierre(id) {
  if (!_supabase) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  if (confirm('¿Estás seguro de que deseas eliminar este registro de cierre de caja?')) {
    try {
      const { error } = await _supabase
        .from('cierres')
        .delete()
        .eq('id', id);

      if (error) throw error;

      alert('Cierre de caja eliminado con éxito.');
      await cargarDatosGlobales();

    } catch (err) {
      console.error('Error al eliminar cierre:', err);
      alert('Error al eliminar cierre: ' + err.message);
    }
  }
}

// Registro global de funciones
window.obtenerFechaLocal = obtenerFechaLocal;
window.cargarDatosGlobales = cargarDatosGlobales;
window.buscarProductos = buscarProductos;
window.registrarVenta = registrarVenta;
window.eliminarVenta = eliminarVenta;
window.calcularBalanceCaja = calcularBalanceCaja;
window.actualizarDiferenciaCierre = actualizarDiferenciaCierre;
window.registrarCierreCaja = registrarCierreCaja;
window.renderCierres = renderCierres;
window.eliminarCierre = eliminarCierre;

document.addEventListener('DOMContentLoaded', () => {
  cargarDatosGlobales();
});
