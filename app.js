// Configuración de Supabase
const SUPABASE_URL = 'https://cdwvzbugtrxsgefzpadz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gWOLb2P47i8qiQuSAnAldA_54neh6U7';

let _supabase = null;

function inicializarSupabase() {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window._supabase = _supabase;
    window.supabaseClient = _supabase;
  } else {
    console.error("Librería de Supabase no cargada aún.");
  }
  return _supabase;
}

window.productos = [];
window.ventas = [];
window.gastos = [];
window.cierres = [];

// Función para obtener la fecha local en formato YYYY-MM-DD sin desfase UTC
function obtenerFechaLocal() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset() * 60000;
  return new Date(hoy.getTime() - offset).toISOString().split('T')[0];
}

// Cargar todos los datos desde Supabase
async function cargarDatosGlobales() {
  const client = _supabase || inicializarSupabase();
  if (!client) return;

  try {
    const { data: prods, error: errProds } = await client.from('productos').select('*');
    if (errProds) console.error("Error al cargar productos:", errProds);
    else window.productos = prods || [];

    const { data: vts, error: errVts } = await client.from('ventas').select('*');
    if (errVts) console.error("Error al cargar ventas:", errVts);
    else window.ventas = vts || [];

    const { data: gsts, error: errGsts } = await client.from('gastos').select('*');
    if (errGsts) console.error("Error al cargar gastos:", errGsts);
    else window.gastos = gsts || [];

    const { data: crrs, error: errCrrs } = await client.from('cierres').select('*').order('created_at', { ascending: false });
    if (errCrrs) console.error("Error al cargar cierres:", errCrrs);
    else window.cierres = crrs || [];

    // Disparar las funciones de renderizado que existan en la página actual
    if (typeof renderGridProductos === 'function') renderGridProductos();
    if (typeof actualizarMetricasUI === 'function') actualizarMetricasUI();
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderGastos === 'function') renderGastos();
    if (typeof renderListaGastos === 'function') renderListaGastos();
    if (typeof calcularBalanceCaja === 'function') calcularBalanceCaja();
    if (typeof renderCierres === 'function') renderCierres();

  } catch (err) {
    console.error("Error en cargarDatosGlobales:", err);
  }
}

// Filtrar productos
function buscarProductos(termino = '') {
  if (!termino.trim()) return window.productos || [];
  const query = termino.toLowerCase().trim();
  return (window.productos || []).filter(p => 
    (p.nombre && p.nombre.toLowerCase().includes(query)) ||
    (p.producto && p.producto.toLowerCase().includes(query))
  );
}

// Registrar venta
async function registrarVenta(productoSeleccionado, cantidad, metodoPago = 'Efectivo', descuento = 0) {
  const client = _supabase || inicializarSupabase();
  if (!client) {
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

    const { error: errVenta } = await client
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
      await client
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

// Eliminar venta
async function eliminarVenta(id) {
  const client = _supabase || inicializarSupabase();
  if (!client) return;

  if (confirm('¿Deseas eliminar esta venta? El stock será devuelto al inventario.')) {
    try {
      const ventaAEliminar = (window.ventas || []).find(v => v.id === id);

      const { error } = await client
        .from('ventas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (ventaAEliminar && ventaAEliminar.producto_id) {
        const prod = (window.productos || []).find(p => p.id === ventaAEliminar.producto_id);
        if (prod && prod.stock !== null && prod.stock !== undefined) {
          const cantidadDevuelta = ventaAEliminar.cantidad || 1;
          await client
            .from('productos')
            .update({ stock: prod.stock + cantidadDevuelta })
            .eq('id', prod.id);
        }
      }

      alert('Venta eliminada y stock devuelto.');
      await cargarDatosGlobales();

    } catch (err) {
      console.error('Error al eliminar venta:', err);
      alert('Error al eliminar venta: ' + err.message);
    }
  }
}

// Balance diario de caja
function calcularBalanceCaja() {
  const fechaHoy = obtenerFechaLocal();
  
  const lblFecha = document.getElementById('caja-fecha-hoy');
  if (lblFecha) lblFecha.innerText = fechaHoy;

  const inputBase = document.getElementById('caja-base-input');
  const base = parseFloat(inputBase ? inputBase.value : 0) || 0;

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

  const gastosHoy = (window.gastos || []).filter(g => (g.fecha || '').startsWith(fechaHoy));
  const gastosEfectivo = gastosHoy.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);

  const efectivoEsperado = base + ventasEfectivo - gastosEfectivo;
  const totalGeneral = ventasEfectivo + ventasTransferencia + ventasTarjeta;

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
    lbl.innerHTML = '¡C
