// Configuración de Supabase
const SUPABASE_URL = 'https://gWOLb2P47i8qiQuSAnAldA.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gWOLb2P47i8qiQuSAnAldA_54neh6U7';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let productos = [];
let ventas = [];
let gastos = [];

// Cargar todos los datos desde Supabase
async function cargarDatosGlobales() {
  try {
    const { data: prods, error: errP } = await _supabase.from('productos').select('*');
    if (prods) productos = prods;

    const { data: vts, error: errV } = await _supabase.from('ventas').select('*').order('id', { ascending: false });
    if (vts) ventas = vts;

    const { data: gst, error: errG } = await _supabase.from('gastos').select('*').order('id', { ascending: false });
    if (gst) gastos = gst;

    updateDashboard();

    if (typeof renderProductosVenta === 'function') renderProductosVenta();
    if (typeof renderProductos === 'function') renderProductos();
    if (typeof renderGastos === 'function') renderGastos();
    if (typeof renderVentas === 'function') renderVentas();
  } catch (err) {
    console.error('Error al cargar datos desde Supabase:', err);
  }
}

function updateDashboard() {
  const totalIngresos = ventas.reduce((acc, v) => acc + Number(v.ingreso || v.total || 0), 0);
  const totalReinversionVentas = ventas.reduce((acc, v) => acc + Number(v.reinversion || 0), 0);
  const totalGananciaBruta = ventas.reduce((acc, v) => acc + Number(v.gananciaBruta || 0), 0);

  const totalGastosFijos = gastos
    .filter(g => g.tipo === 'OPERATIVO' || !g.tipo)
    .reduce((acc, g) => acc + Number(g.monto || 0), 0);

  const totalReinversionGastos = gastos
    .filter(g => g.tipo === 'REINVERSION')
    .reduce((acc, g) => acc + Number(g.monto || 0), 0);

  const gananciaNeta = totalGananciaBruta - totalGastosFijos;
  const reinversionTotal = totalReinversionVentas + totalReinversionGastos;

  const elBruto = document.getElementById('dash-total-bruto');
  const elReinv = document.getElementById('dash-reinversion');
  const elGastos = document.getElementById('dash-total-gastos');
  const elNeta = document.getElementById('dash-ganancia-neta');
  const elCant = document.getElementById('dash-cant-ventas');

  if (elBruto) elBruto.innerText = `$${totalIngresos.toFixed(2)}`;
  if (elReinv) elReinv.innerText = `$${reinversionTotal.toFixed(2)}`;
  if (elGastos) elGastos.innerText = `$${totalGastosFijos.toFixed(2)}`;
  if (elNeta) elNeta.innerText = `$${gananciaNeta.toFixed(2)}`;
  if (elCant) elCant.innerText = ventas.length;
}

function exportarCSV() {
  let csv = 'Fecha,Producto,Cantidad,Ingreso Total,Fondo Reinversion,Ganancia Bruta\n';
  ventas.forEach(v => {
    csv += `"${v.fecha || ''}","${v.producto}",${v.cantidad || 1},${v.ingreso || 0},${v.reinversion || 0},${v.gananciaBruta || 0}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Reporte_Ventas_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function copiarResumen() {
  const totalIngresos = ventas.reduce((acc, v) => acc + Number(v.ingreso || v.total || 0), 0);
  const totalGastosFijos = gastos.filter(g => g.tipo === 'OPERATIVO' || !g.tipo).reduce((acc, g) => acc + Number(g.monto || 0), 0);
  const totalGananciaBruta = ventas.reduce((acc, v) => acc + Number(v.gananciaBruta || 0), 0);
  const gananciaNeta = totalGananciaBruta - totalGastosFijos;

  const resumen = `📊 RESUMEN MI POS\nVentas Brutas: $${totalIngresos.toFixed(2)}\nGastos Fijos: $${totalGastosFijos.toFixed(2)}\nGanancia Neta: $${gananciaNeta.toFixed(2)}`;
  navigator.clipboard.writeText(resumen);
  alert('Resumen copiado al portapapeles');
}

document.addEventListener('DOMContentLoaded', cargarDatosGlobales);
