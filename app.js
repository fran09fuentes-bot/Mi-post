// Almacenamiento Local (LocalData / Backup)
let productos = JSON.parse(localStorage.getItem('pos_prods')) || [
  { id: 1, nombre: 'Producto Ejemplo 1', costo: 5.00, precio: 10.00, stock: 10 },
  { id: 2, nombre: 'Producto Ejemplo 2', costo: 8.00, precio: 15.00, stock: 2 }
];
let ventas = JSON.parse(localStorage.getItem('pos_vts')) || [];
let gastos = JSON.parse(localStorage.getItem('pos_gst')) || [];

function updateDashboard() {
  const totalIngresos = ventas.reduce((acc, v) => acc + (v.ingreso || v.total || 0), 0);
  const totalReinversionVentas = ventas.reduce((acc, v) => acc + (v.reinversion || 0), 0);
  const totalGananciaBruta = ventas.reduce((acc, v) => acc + (v.gananciaBruta || 0), 0);
  
  const totalGastosFijos = gastos
    .filter(g => g.tipo === 'OPERATIVO' || !g.tipo)
    .reduce((acc, g) => acc + (g.monto || 0), 0);

  const totalReinversionGastos = gastos
    .filter(g => g.tipo === 'REINVERSION')
    .reduce((acc, g) => acc + (g.monto || 0), 0);

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
  const totalIngresos = ventas.reduce((acc, v) => acc + (v.ingreso || v.total || 0), 0);
  const totalGastosFijos = gastos.filter(g => g.tipo === 'OPERATIVO' || !g.tipo).reduce((acc, g) => acc + (g.monto || 0), 0);
  const totalGananciaBruta = ventas.reduce((acc, v) => acc + (v.gananciaBruta || 0), 0);
  const gananciaNeta = totalGananciaBruta - totalGastosFijos;
  
  const resumen = `📊 RESUMEN MI POS\nVentas Brutas: $${totalIngresos.toFixed(2)}\nGastos Fijos: $${totalGastosFijos.toFixed(2)}\nGanancia Neta: $${gananciaNeta.toFixed(2)}`;
  navigator.clipboard.writeText(resumen);
  alert('Resumen copiado al portapapeles');
}
