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
window.compras = [];

// Función para obtener la fecha local en formato YYYY-MM-DD sin desfase UTC
function obtenerFechaLocal() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset() * 60000;
  return new Date(hoy.getTime() - offset).toISOString().split('T')[0];
}

// Cargar todos los datos desde Supabase con manejo aislado de errores
async function cargarDatosGlobales() {
  if (!_supabase) return;

  try {
    // 1. Cargar productos
    try {
      const { data: prods, error: errProds } = await _supabase.from('productos').select('*');
      if (errProds) console.error("Error al cargar productos:", errProds);
      else window.productos = prods || [];
    } catch (e) { console.error("Error de red en productos:", e); }

    // 2. Cargar ventas
    try {
      const { data: vts, error: errVts } = await _supabase.from('ventas').select('*');
      if (errVts) console.error("Error al cargar ventas:", errVts);
      else window.ventas = vts || [];
    } catch (e) { console.error("Error de red en ventas:", e); }

    // 3. Cargar gastos
    try {
      const { data: gsts, error: errGsts } = await _supabase.from('gastos').select('*');
      if (errGsts) console.error("Error al cargar gastos:", errGsts);
      else window.gastos = gsts || [];
    } catch (e) { console.error("Error de red en gastos:", e); }

    // 4. Cargar cierres
    try {
      const { data: crrs, error: errCrrs } = await _supabase.from('cierres').select('*');
      if (errCrrs) console.error("Error al cargar cierres:", errCrrs);
      else window.cierres = crrs || [];
    } catch (e) { console.error("Error de red en cierres:", e); }

    // 5. Cargar compras
    try {
      const { data: cmprs, error: errCmprs } = await _supabase.from('compras').select('*');
      if (errCmprs) console.error("Error al cargar compras:", errCmprs);
      else window.compras = cmprs || [];
    } catch (e) { console.error("Error de red en compras:", e); }

    // Refrescar automáticamente la interfaz actual
    if (typeof renderProductosVenta === 'function') renderProductosVenta();
    if (typeof actualizarMetricasUI === 'function') actualizarMetricasUI();
    if (typeof calcularBalanceCaja === 'function') calcularBalanceCaja();
    if (typeof renderCierres === 'function') renderCierres();
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderGastos === 'function') renderGastos();
    if (typeof renderListaGastos === 'function') renderListaGastos();
    if (typeof renderCompras === 'function') renderCompras();

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

// Actualizar las tarjetas de la pantalla superior en Vender
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

    let gananciaBruta = 0;
    if (v.ganancia_bruta !== undefined && v.ganancia_bruta !== null) gananciaBruta = Number(v.ganancia_bruta);
    else if (v.gananciaBruta !== undefined && v.gananciaBruta !== null) gananciaBruta = Number(v.gananciaBruta);
    else if (v.ganancia_neta !== undefined && v.ganancia_neta !== null) gananciaBruta = Number(v.ganancia_neta);
    else if (v.gananciaNeta !== undefined && v.gananciaNeta !== null) gananciaBruta = Number(v.gananciaNeta);

    let costoReposicion = 0;
    if (v.reinversion !== undefined && v.reinversion !== null) costoReposicion = Number(v.reinversion);
    else if (v.costo !== undefined && v.costo !== null) costoReposicion = Number(v.costo);
    else costoReposicion = total - gananciaBruta;

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

  // Solo Gastos Operativos reducen la ganancia neta
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

  const cant = Number(cantidad) || 1;

  if (prod.stock !== null && prod.stock !== undefined && prod.stock < cant) {
    alert(`Stock insuficiente. Quedan ${prod.stock} unidades de ${prod.nombre || prod.producto}.`);
    return;
  }

  try {
    const precioUnitario = Number(prod.precio) || 0;
    const costoUnitario = Number(prod.costo) || 0;
    const desc = Number(descuento) || 0;

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
          reinversion: costoTotalVenta,
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
    console
