// Configuración de Supabase
const SUPABASE_URL = 'https://cdwvzbugtrxsgefzpadz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_gWOLb2P47i8qiQuSAnAldA_54neh6U7';

let _supabase = null;

// Función segura de inicialización para evitar que falle si el CDN tarda un instante
function obtenerSupabase() {
  if (_supabase) return _supabase;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    window._supabase = _supabase;
    window.supabaseClient = _supabase;
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

// Cargar todos los datos desde Supabase y refrescar las vistas
async function cargarDatosGlobales() {
  const client = obtenerSupabase();
  if (!client) {
    // Si la librería de Supabase aún carga, reintentamos en 200ms automáticamente
    setTimeout(cargarDatosGlobales, 200);
    return;
  }

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

    // Refrescar automáticamente todas las vistas de la interfaz
    if (typeof renderProductosVenta === 'function') renderProductosVenta();
    if (typeof renderGridProductos === 'function') renderGridProductos();
    if (typeof actualizarMetricasUI === 'function') actualizarMetricasUI();

    if (typeof calcularBalanceCaja === 'function') calcularBalanceCaja();
    if (typeof renderCierres === 'function') renderCierres();
    if (typeof renderHistorial === 'function') renderHistorial();
    if (typeof renderGastos === 'function') renderGastos();
    if (typeof renderListaGastos === 'function') renderListaGastos();
    if (typeof renderResumenMensual === 'function') renderResumenMensual();

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
  if (elVentasHoy) elVentasHoy.textContent = `$${ventasHoy.toFixed(2)}`;

  const elGananciaNeta = document.getElementById('metric-ganancia-neta') || document.getElementById('total-ganancia-neta');
  if (elGananciaNeta) elGananciaNeta.textContent = `$${gananciaNetaMes.toFixed(2)}`;

  const elReinversion = document.getElementById('metric-reinversion') || document.getElementById('total-reinversion');
  if (elReinversion) elReinversion.textContent = `$${reinversionMes.toFixed(2)}`;

  const elVentasAcum = document.getElementById('metric-ventas-acum') || document.getElementById('total-ventas-brutas');
  if (elVentasAcum) elVentasAcum.textContent = `$${totalVentasAcumuladas.toFixed(2)}`;

  const elGastosFijos = document.getElementById('metric-gastos-fijos') || document.getElementById('total-gastos');
  if (elGastosFijos) elGastosFijos.textContent = `$${gastosMes.toFixed(2)}`;

  const elVentasReg = document.getElementById('metric-ventas-reg') || document.getElementById('cant-ventas');
  if (elVentasReg) elVentasReg.textContent = `${ventasRegCount}`;

  if (typeof renderResumenMensual === 'function') {
    renderResumenMensual();
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

// Registrar Ventas
async function registrarVenta(productoSeleccionado, cantidad, metodoPago = 'Efectivo', descuento = 0) {
  const client = obtenerSupabase();
  if (!client) {
    alert("Error: Supabase no está conectado.");
    return;
  }

  const prod = productoSeleccionado || window.productoSeleccionadoActual;
  if (!prod) {
    alert("Por favor selecciona un producto de la lista.");
    return;
  }

  if (prod.stock !== null && prod.stock !== undefined && prod.stock < cantidad) {
    alert(`Stock insuficiente. Quedan ${prod.stock} unidades de ${prod.nombre || prod.producto}.`);
    return;
  }

  try {
    const precioUnitario = Number(prod.precio) || 0;
    const costoUnitario = Number(prod.costo) || 0;
    const subtotal = precioUnitario * cantidad;
    const totalVenta = Math.max(0, subtotal - descuento);
    const gananciaBruta = (precioUnitario - costoUnitario) * cantidad - descuento;
    const reinversion = costoUnitario * cantidad;

    const { error: errVenta } = await client
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
      await client
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
  const client = obtenerSupabase();
  if (!client) return;

  if (confirm('¿Deseas eliminar esta venta? El stock será devuelto al inventario.')) {
    try {
      const ventaAEliminar = (window.ventas || []).find(v => v.id === id);

      const { error } = await client.from('ventas').delete().eq('id', id);
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
  if (elTotalGen) elTotalGen
