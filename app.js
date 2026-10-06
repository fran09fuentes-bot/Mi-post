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
    else window.cierres = crrs || [];

    // Refrescar automáticamente la interfaz actual
    renderProductosVenta();
    actualizarMetricasUI();

    if (typeof calcularBalanceCaja === 'function') calcularBalanceCaja();
    if (typeof renderCierres === 'function') renderCierres();
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderGastos === 'function') renderGastos();
    if (typeof renderListaGastos === 'function') renderListaGastos();

  } catch (err) {
    console.error("Error en cargarDatosGlobales:", err);
  }
}

// Dibujar productos en el selector de Vender (index.html)
function renderProductosVenta(filtro = '') {
  const contenedor = document.getElementById('grid-productos-venta') || 
                     document.getElementById('grid-productos') || 
                     document.getElementById('lista-productos-venta');
                     
  if (!contenedor) return;

  const prods = buscarProductos(filtro);

  if (prods.length === 0) {
    contenedor.innerHTML = '<p class="col-span-2 text-xs text-gray-400 text-center py-6">No hay productos disponibles.</p>';
    return;
  }

  contenedor.innerHTML = '';
  prods.forEach(p => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-emerald-500 cursor-pointer transition flex flex-col justify-between';
    
    card.onclick = () => {
      if (typeof seleccionarProducto === 'function') {
        seleccionarProducto(p);
      } else {
        window.productoSeleccionadoActual = p;
        const elNombre = document.getElementById('prod-seleccionado-nombre') || document.getElementById('cart-item-name');
        if (elNombre) elNombre.innerText = p.nombre || p.producto;
      }
    };

    const nombre = p.nombre || p.producto || 'Producto';
    const precio = Number(p.precio || 0).toFixed(2);
    const stock = p.stock !== null && p.stock !== undefined ? p.stock : 'N/A';

    card.innerHTML = `
      <div>
        <p class="font-bold text-slate-800 text-xs truncate">${nombre}</p>
        <p class="text-[10px] text-gray-400">Stock: ${stock}</p>
      </div>
      <div class="mt-2 flex justify-between items-center">
        <span class="font-black text-emerald-600 text-xs">$${precio}</span>
        <span class="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded">Elegir</span>
      </div>
    `;
    contenedor.appendChild(card);
  });
}

// Actualizar las tarjetas de la pantalla superior en Vender (Aplica Fórmulas 2 y 3)
function actualizarMetricasUI() {
  const hoyStr = obtenerFechaLocal();
  const mesActual = new Date().getMonth();
  const anioActual = new Date().getFullYear();

  let ventasHoy = 0;
  let gananciaBrutaMes = 0;
  let reposicionStockMes = 0;
  let ventasRegCount = 0;
  let totalVentasAcumuladas = 0;

  (window.ventas || []).forEach(v => {
    const fechaVenta = new Date(v.fecha || v.created_at || Date.now());
    const fechaStr = (v.fecha || '').split('T')[0];
    const total = Number(v.total || v.ingreso || 0);
    const gananciaBruta = Number(v.ganancia_bruta ?? v.gananciaBruta ?? v.ganancia_neta ?? v.gananciaNeta ?? 0);
    const costoReposicion = Number(v.reinversion ?? v.costo ?? (total - gananciaBruta));

    totalVentasAcumuladas += total;

    if (fechaStr === hoyStr) {
      ventasHoy += total;
    }

    if (fechaVenta.getMonth() === mesActual && fechaVenta.getFullYear() === anioActual) {
      gananciaBrutaMes += gananciaBruta;
      reposicionStockMes += costoReposicion;
      ventasRegCount++;
    }
  });

  // Gastos operativos del mes (Fórmula 3)
  let gastosMes = 0;
  (window.gastos || []).forEach(g => {
    const fechaGasto = new Date(g.fecha || g.created_at || Date.now());
    if (fechaGasto.getMonth() === mesActual && fechaGasto.getFullYear() === anioActual) {
      gastosMes += Number(g.monto || g.precio || 0);
    }
  });

  const gananciaNetaMes = gananciaBrutaMes - gastosMes;

  // Actualizar los elementos en pantalla si existen
  const elVentasHoy = document.getElementById('metric-ventas-hoy') || document.getElementById('total-ventas-hoy');
  if (elVentasHoy) elVentasHoy.textContent = `$${ventasHoy.toFixed(2)}`;

  const elGananciaNeta = document.getElementById('metric-ganancia-neta');
  if (elGananciaNeta) elGananciaNeta.textContent = `$${gananciaNetaMes.toFixed(2)}`;

  const elReinversion = document.getElementById('metric-reinversion');
  if (elReinversion) elReinversion.textContent = `$${reposicionStockMes.toFixed(2)}`;

  const elVentasAcum = document.getElementById('metric-ventas-acum');
  if (elVentasAcum) elVentasAcum.textContent = `$${totalVentasAcumuladas.toFixed(2)}`;

  const elGastosFijos = document.getElementById('metric-gastos-fijos');
  if (elGastosFijos) elGastosFijos.textContent = `$${gastosMes.toFixed(2)}`;

  const elVentasReg = document.getElementById('metric-ventas-reg');
  if (elVentasReg) elVentasReg.textContent = `${ventasRegCount}`;
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

// Registrar Ventas (Aplica Fórmula 1)
async function registrarVenta(productoSeleccionado, cantidad, metodoPago = 'Efectivo', descuento = 0) {
  if (!_supabase) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  const prod = productoSeleccionado || window.productoSeleccionadoActual;
  if (!prod) {
    alert("Por favor selecciona un producto de la lista.");
    return;
  }

  const cant = Number(cantidad) || 1;

  if (prod.stock !== null && prod.stock !== undefined && prod.stock < cant) {
    alert(`Stock insuficiente. Quedan ${prod.stock} unidades de ${prod.nombre || prod.producto}.`);
    return;
  }

  try {
    const precioUnitario = Number(prod.precio) || 0;
    const costoUnitario = Number(prod.costo) || 0;
    const desc = Number(descuento) || 0;

    // FÓRMULA 1: Venta Individual
    const costoTotalVenta = costoUnitario * cant; // Reposición de Stock
    const precioTotalVenta = Math.max(0, (precioUnitario * cant) - desc);
    const gananciaBrutaVenta = precioTotalVenta - costoTotalVenta;

    const { error: errVenta } = await _supabase
      .from('ventas')
      .insert([
        {
          cliente: 'Cliente General',
          producto: prod.nombre || prod.producto,
          producto_id: prod.id,
          cantidad: cant,
          precio: precioUnitario,
          costo: costoTotalVenta,
          descuento: desc,
          total: precioTotalVenta,
          ingreso: precioTotalVenta,
          gananciaBruta: gananciaBrutaVenta,
          ganancia_bruta: gananciaBrutaVenta,
          gananciaNeta: gananciaBrutaVenta,
          ganancia_neta: gananciaBrutaVenta,
          reinversion: costoTotalVenta, // Reposición de Stock
          metodo_pago: metodoPago,
          fecha: new Date().toISOString()
        }
      ]);

    if (errVenta) throw errVenta;

    if (prod.stock !== null && prod.stock !== undefined) {
      await _supabase
        .from('productos')
        .update({ stock: Math.max(0, prod.stock - cant) })
        .eq('id', prod.id);
    }

    alert('¡Venta registrada con éxito!');
    await cargarDatosGlobales();

  } catch (error) {
    console.error('Error al registrar venta:', error);
    alert('Error al registrar venta: ' + error.message);
  }
}

// Eliminar Ventas
async function eliminarVenta(id) {
  if (!_supabase) return;

  if (confirm('¿Deseas eliminar esta venta? El stock será devuelto al inventario.')) {
    try {
      const ventaAEliminar = (window.ventas || []).find(v => v.id === id);

      const { error } = await _supabase.from('ventas').delete().eq('id', id);
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

    } catch (err) {
      console.error('Error al eliminar venta:', err);
      alert('Error al eliminar venta: ' + err.message);
    }
  }
}

// Control de Caja (Aplica Fórmula 4)
function calcularBalanceCaja() {
  const fechaHoy = obtenerFechaLocal();
  
  const lblFecha = document.getElementById('caja-fecha-hoy');
  if (lblFecha) lblFecha.innerText = fechaHoy;

  const inputBase = document.getElementById('caja-base-input');
  const base = parseFloat(inputBase ? inputBase.value : 0) || 0;

  const ventasHoy = (window.ventas || []).filter(v => (v.fecha || '').startsWith(fechaHoy));
  
  let ventasEfectivo = 0, ventasTransferencia = 0, ventasTarjeta = 0;

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
  const gastosEfectivo = gastosHoy.reduce((acc, g) => {
    const metodoGasto = (g.metodo_pago || g.metodo || 'Efectivo').toLowerCase();
    if (metodoGasto.includes('efectivo') || !metodoGasto) {
      return acc + (parseFloat(g.monto || g.precio) || 0);
    }
    return acc;
  }, 0);

  // FÓRMULA 4: Balance de Caja
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
    lbl.innerHTML = '¡Caja perfectamente cuadrada! ($0.00)';
  } else if (diff > 0) {
    box.className = 'alert alert-warning d-flex justify-content-between align-items-center mb-3 py-2 px-3';
    lbl.innerHTML = `Sobrante: +$${diff.toFixed(2)}`;
  } else {
    box.className = 'alert alert-danger d-flex justify-content-between align-items-center mb-3 py-2 px-3';
    lbl.innerHTML = `Faltante: -$${Math.abs(diff).toFixed(2)}`;
  }
}

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

function renderCierres() {
  const contenedor = document.getElementById('lista-cierres-guardados');
  if (!contenedor) return;

  const cierres = window.cierres || [];

  if (cierres.length === 0) {
    contenedor.innerHTML = '<div class="text-muted small text-center py-3">No hay cierres registrados aún.</div>';
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

// Registro global de funciones
window.obtenerFechaLocal = obtenerFechaLocal;
window.cargarDatosGlobales = cargarDatosGlobales;
window.renderProductosVenta = renderProductosVenta;
window.actualizarMetricasUI = actualizarMetricasUI;
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
