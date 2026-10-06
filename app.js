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

    // Refrescar vistas en todos los módulos
    renderGridProductos();
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

// Renderizar rejilla de productos en la vista de Ventas (index.html)
function renderGridProductos(filtro = '') {
  const contenedor = document.getElementById('grid-productos') || document.getElementById('grid-productos-venta');
  if (!contenedor) return;

  const productosFiltrados = buscarProductos(filtro);

  if (productosFiltrados.length === 0) {
    contenedor.innerHTML = '<p class="text-xs text-gray-400 text-center py-6 col-span-2">No hay productos disponibles.</p>';
    return;
  }

  contenedor.innerHTML = '';
  productosFiltrados.forEach(p => {
    const card = document.createElement('div');
    card.className = 'p-3 bg-white border rounded-xl shadow-sm hover:border-emerald-500 cursor-pointer transition flex flex-col justify-between';
    card.onclick = () => {
      if (typeof seleccionarProducto === 'function') {
        seleccionarProducto(p);
      } else if (typeof seleccionarProductoVenta === 'function') {
        seleccionarProductoVenta(p);
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

// Actualizar las tarjetas de métricas en la vista principal
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

  // Restar gastos del mes a la ganancia neta
  let gastosMes = 0;
  (window.gastos || []).forEach(g => {
    const fechaGasto = new Date(g.fecha || g.created_at || Date.now());
    if (fechaGasto.getMonth() === mesActual && fechaGasto.getFullYear() === anioActual) {
      gastosMes += Number(g.monto || g.precio || 0);
    }
  });

  gananciaNetaMes -= gastosMes;

  // Actualizar elementos DOM si existen
  const elVentasHoy = document.getElementById('metric-ventas-hoy');
  if (elVentasHoy) elVentasHoy.textContent = `$${ventasHoy.toFixed(2)}`;

  const elGananciaNeta = document.getElementById('metric-ganancia-neta');
  if (elGananciaNeta) elGananciaNeta.textContent = `$${gananciaNetaMes.toFixed(2)}`;

  const elReinversion = document.getElementById('metric-reinversion');
  if (elReinversion) elReinversion.textContent = `$${reinversionMes.toFixed(2)}`;

  const elVentasAcum = document.getElementById('metric-ventas-acum');
  if (elVentasAcum) elVentasAcum.textContent = `$${totalVentasAcumuladas.toFixed(2)}`;

  const elGastosFijos = document.getElementById('metric-gastos-fijos');
  if (elGastosFijos) elGastosFijos.textContent = `$${gastosMes.toFixed(2)}`;

  const elVentasReg = document.getElementById('metric-ventas-reg');
  if (elVentasReg) elVentasReg.textContent = `${ventasRegCount}`;
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

    const { error: errVenta } = await _supabase
      .from('ventas')
      .insert([
        {
          cliente: 'Cliente General',
          producto: productoSeleccionado.nombre || productoSeleccionado.producto,
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
              nombre: productoSeleccionado.nombre || productoSeleccionado.producto,
              cantidad: cantidad,
              precio: precioUnitario,
              total: totalVenta
            }
          ],
          fecha: new Date().toISOString()
        }
      ]);

    if (errVenta)
