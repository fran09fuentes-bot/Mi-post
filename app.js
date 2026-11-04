rior en Vender
function actualizarMetricasUI() {
const hoyStr = obtenerFechaLocal();
const mesActual = new Date().getMonth();
const anioActual = new Date().getFullYear();

let ventasHoy = 0;
let gananciaNetaMes = 0;
let reinversionMes = 0;
let ventasRegCount = 0;
let totalVentasAcumuladas = 0;

(window.ventas || []).forEach(v => {
const fechaVenta = new Date(v.fecha || v.created_at || Date.now());
const fechaStr = (v.fecha || '').split('T')[0];
const total = Number(v.total || v.ingreso || 0);
const ganancia = Number(v.gananciaNeta || v.ganancia_neta || v.gananciaBruta || v.ganancia_bruta || 0);
const reinversioVal = Number(v.reinversion || v.costo || 0);

totalVentasAcumuladas += total;

if (fechaStr === hoyStr) {
  ventasHoy += total;
}

if (fechaVenta.getMonth() === mesActual && fechaVenta.getFullYear() === anioActual) {
  gananciaNetaMes += ganancia;
  reinversionMes += reinversioVal;
  ventasRegCount++;
}


});

// Descontar gastos del mes
let gastosMes = 0;
(window.gastos || []).forEach(g => {
const fechaGasto = new Date(g.fecha || g.created_at || Date.now());
if (fechaGasto.getMonth() === mesActual && fechaGasto.getFullYear() === anioActual) {
gastosMes += Number(g.monto || g.precio || 0);
}
});

gananciaNetaMes -= gastosMes;

// Actualizar los elementos en pantalla si existen
const elVentasHoy = document.getElementById('metric-ventas-hoy') || document.getElementById('total-ventas-hoy');
if (elVentasHoy) elVentasHoy.textContent = $${ventasHoy.toFixed(2)};

const elGananciaNeta = document.getElementById('metric-ganancia-neta');
if (elGananciaNeta) elGananciaNeta.textContent = $${gananciaNetaMes.toFixed(2)};

const elReinversion = document.getElementById('metric-reinversion');
if (elReinversion) elReinversion.textContent = $${reinversionMes.toFixed(2)};

const elVentasAcum = document.getElementById('metric-ventas-acum');
if (elVentasAcum) elVentasAcum.textContent = $${totalVentasAcumuladas.toFixed(2)};

const elGastosFijos = document.getElementById('metric-gastos-fijos');
if (elGastosFijos) elGastosFijos.textContent = $${gastosMes.toFixed(2)};

const elVentasReg = document.getElementById('metric-ventas-reg');
if (elVentasReg) elVentasReg.textContent = ${ventasRegCount};
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

// Registrar Ventas
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

if (prod.stock !== null && prod.stock !== undefined && prod.stock < cantidad) {
alert(Stock insuficiente. Quedan ${prod.stock} unidades de ${prod.nombre || prod.producto}.);
return;
}

try {
const precioUnitario = Number(prod.precio) || 0;
const costoUnitario = Number(prod.costo) || 0;
const subtotal = precioUnitario * cantidad;
const totalVenta = Math.max(0, subtotal - descuento);
const gananciaBruta = (precioUnitario - costoUnitario) * cantidad - descuento;
const reinversion = costoUnitario * cantidad;

const { error: errVenta } = await _supabase
  .from('ventas')
  .insert([
    {
      cliente: 'Cliente General',
      producto: prod.nombre || prod.producto,
      producto_id: prod.id,
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
      fecha: new Date().toISOString()
    }
  ]);

if (errVenta) throw errVenta;

if (prod.stock !== null && prod.stock !== undefined) {
  await _supabase
    .from('productos')
    .update({ stock: Math.max(0, prod.stock - cantidad) })
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

// Control de Caja
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
const gastosEfectivo = gastosHoy.reduce((acc, g) => acc + (parseFloat(g.monto) || 0), 0);

const efectivoEsperado = base + ventasEfectivo - gastosEfectivo;
const totalGeneral = ventasEfectivo + ventasTransferencia + ventasTarjeta;

const elBase = document.getElementById('bal-base');
if (elBase) elBase.innerText = $${base.toFixed(2)};

const elVentasEfectivo = document.getElementById('bal-ventas-efectivo');
if (elVentasEfectivo) elVentasEfectivo.innerText = $${ventasEfectivo.toFixed(2)};

const elGastosEfectivo = document.getElementById('bal-gastos-efectivo');
if (elGastosEfectivo) elGastosEfectivo.innerText = $${gastosEfectivo.toFixed(2)};

const elEfectivoEsperado = document.getElementById('bal-efectivo-esperado');
if (elEfectivoEsperado) elEfectivoEsperado.innerText = $${efectivoEsperado.toFixed(2)};

const elTrans = document.getElementById('bal-transferencias');
if (elTrans) elTrans.innerText = $${ventasTransferencia.toFixed(2)};

const elTarj = document.getElementById('bal-tarjeta');
if (elTarj) elTarj.innerText = $${ventasTarjeta.toFixed(2)};

const elTotalGen = document.getElementById('bal-total-general');
if (elTotalGen) elTotalGen.innerText = $${totalGeneral.toFixed(2)};

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
lbl.innerHTML = Sobrante: +$${diff.toFixed(2)};
} else {
box.className = 'alert alert-danger d-flex justify-content-between align-items-center mb-3 py-2 px-3';
lbl.innerHTML = Faltante: -$${Math.abs(diff).toFixed(2)};
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
contenedor.innerHTML = 'No hay cierres registrados aún.';
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

// ==========================================
// MÓDULO NUEVO: RESUMEN MENSUAL Y GRÁFICAS
// ==========================================

function inicializarSelectoresResumen() {
const selectMes = document.getElementById('resumen-select-mes');
const selectAnio = document.getElementById('resumen-select-anio');

if (!selectMes || !selectAnio) return;

const hoy = new Date();
const anioActual = hoy.getFullYear();

if (selectAnio.options.length === 0) {
for (let a = anioActual; a >= anioActual - 3; a--) {
const opt = document.createElement('option');
opt.value = a;
opt.textContent = a;
selectAnio.appendChild(opt);
}
}

if (!selectMes.dataset.initialized) {
selectMes.value = hoy.getMonth();
selectAnio.value = anioActual;
selectMes.dataset.initialized = "true";
}
}

let miGraficoDias = null;

function renderGraficaDiasSemana(labels, datos) {
const canvas = document.getElementById('chart-dias-semana');
if (!canvas) return;

const ctx = canvas.getContext('2d');

const maxVenta = Math.max(...datos);
const idxMax = datos.indexOf(maxVenta);
const labelMejor = document.getElementById('label-mejor-dia');

if (labelMejor) {
if (maxVenta > 0) {
labelMejor.innerText = Top: ${labels[idxMax]} ($${maxVenta.toFixed(2)});
} else {
labelMejor.innerText = 'Sin registros';
}
}

if (miGraficoDias) {
miGraficoDias.destroy();
}

const minVenta = Math.min(...datos);
const backgroundColors = datos.map(val => {
if (val === maxVenta && maxVenta > 0) return '#10b981';
if (val === minVenta && maxVenta > 0) return '#f87171';
return '#6366f1';
});

miGraficoDias = new Chart(ctx, {
type: 'bar',
data: {
labels: labels,
datasets: [{
label: 'Ventas ($)',
data: datos,
backgroundColor: backgroundColors,
borderRadius: 6,
}]
},
options: {
responsive: true,
maintainAspectRatio: false,
plugins: {
legend: { display: false },
tooltip: {
callbacks: {
label: (context) =>  Total: $${context.raw.toFixed(2)}
}
}
},
scales: {
y: {
beginAtZero: true,
ticks: {
font: { size: 9 },
callback: (value) => $${value}
},
grid: { color: '#f3f4f6' }
},
x: {
ticks: { font: { size: 10, weight: 'bold' } },
grid: { display: false }
}
}
}
});
}

function renderResumenMensual() {
inicializarSelectoresResumen();

const selectMes = document.getElementById('resumen-select-mes');
const selectAnio = document.getElementById('resumen-select-anio');

const hoy = new Date();
const mesSel = selectMes ? parseInt(selectMes.value, 10) : hoy.getMonth();
const anioSel = selectAnio ? parseInt(selectAnio.value, 10) : hoy.getFullYear();

const ventasMes = (window.ventas || []).filter(v => {
const f = new Date(v.fecha || v.created_at || Date.now());
return f.getMonth() === mesSel && f.getFullYear() === anioSel;
});

const gastosMes = (window.gastos || []).filter(g => {
const f = new Date(g.fecha || g.created_at || Date.now());
return f.getMonth() === mesSel && f.getFullYear() === anioSel;
});

let totalVentas = 0;
let gananciaBruta = 0;
let reinversionTotal = 0;

const ventasPorDiaSemana = [0, 0, 0, 0, 0, 0, 0];
const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const acumuladoProductos = {};

ventasMes.forEach(v => {
const fechaVenta = new Date(v.fecha || v.created_at || Date.now());
const diaSemana = fechaVenta.getDay();
const monto = Number(v.total || v.ingreso || 0);
const cant = Number(v.cantidad || 1);
const nombreProd = v.producto || 'Producto';

totalVentas += monto;
gananciaBruta += Number(v.gananciaNeta || v.ganancia_neta || v.gananciaBruta || v.ganancia_bruta || 0);
reinversionTotal += Number(v.reinversion || v.costo || 0);

ventasPorDiaSemana[diaSemana] += monto;

if (!acumuladoProductos[nombreProd]) {
  acumuladoProductos[nombreProd] = { cantidad: 0, total: 0 };
}
acumuladoProductos[nombreProd].cantidad += cant;
acumuladoProductos[nombreProd].total += monto;


});

const totalGastos = gastosMes.reduce((acc, g) => acc + Number(g.monto || g.precio || 0), 0);
const gananciaNeta = gananciaBruta - totalGastos;
const totalTransacciones = ventasMes.length;
const ticketPromedio = totalTransacciones > 0 ? (totalVentas / totalTransacciones) : 0;

const elTotal = document.getElementById('resumen-total-ventas');
if (elTotal) elTotal.innerText = $${totalVentas.toFixed(2)};

const elGanancia = document.getElementById('resumen-ganancia-neta');
if (elGanancia) elGanancia.innerText = $${gananciaNeta.toFixed(2)};

const elTrans = document.getElementById('resumen-transacciones');
if (elTrans) elTrans.innerText = ${totalTransacciones};

const elTicket = document.getElementById('resumen-ticket-promedio');
if (elTicket) elTicket.innerText = $${ticketPromedio.toFixed(2)};

renderGraficaDiasSemana(nombresDias, ventasPorDiaSemana);

const contenedorTop = document.getElementById('resumen-tabla-top-productos');
if (contenedorTop) {
const topLista = Object.entries(acumuladoProductos)
.map(([nombre, datos]) => ({ nombre, ...datos }))
.sort((a, b) => b.cantidad - a.cantidad)
.slice(0, 5);

if (topLista.length === 0) {
  contenedorTop.innerHTML = `<tr><td colspan="3" class="text-center py-3 text-gray-400 text-[11px]">Sin ventas registradas en este mes.</td></tr>`;
} else {
  contenedorTop.innerHTML = topLista.map(p => `
    <tr class="border-b last:border-0 hover:bg-gray-50">
      <td class="py-1.5 px-2 font-bold text-slate-800 text-left truncate">${p.nombre}</td>
      <td class="py-1.5 px-2 text-center font-bold text-slate-600">${p.cantidad} u.</td>
      <td class="py-1.5 px-2 text-right font-extrabold text-emerald-600">$${p.total.toFixed(2)}</td>
    </tr>
  `).join('');
}


}
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
window.renderResumenMensual = renderResumenMensual;

document.addEventListener('DOMContentLoaded', () => {
cargarDatosGlobales();
});
