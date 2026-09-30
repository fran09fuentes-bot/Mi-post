const registrarVenta = async (productoSeleccionado, cantidad, descuento = 0) => {
  try {
    // 1. Cálculos de los totales y ganancias
    const precioUnitario = Number(productoSeleccionado.precio) || 0;
    const costoUnitario = Number(productoSeleccionado.costo) || 0;
    
    const subtotal = precioUnitario * cantidad;
    const totalVenta = subtotal - descuento;
    
    // Cálculo de ganancias
    const gananciaBruta = (precioUnitario - costoUnitario) * cantidad - descuento;
    const reinversion = costoUnitario * cantidad;
    const gananciaNeta = gananciaBruta; // Ajusta si deduces otros gastos

    // 2. Insertar en Supabase usando .toISOString() para la fecha
    const { data, error } = await supabase
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
          gananciaNeta: gananciaNeta,
          ganancia_neta: gananciaNeta,
          reinversion: reinversion,
          detalles_productos: [
            {
              id: productoSeleccionado.id,
              nombre: productoSeleccionado.nombre,
              cantidad: cantidad,
              precio: precioUnitario,
              total: totalVenta
            }
          ],
          // ✅ AQUÍ ESTÁ LA CORRECCIÓN DE FECHA: Usa ISO String (compatible con PostgreSQL)
          fecha: new Date().toISOString()
        }
      ]);

    if (error) {
      throw error;
    }

    alert('¡Venta registrada con éxito!');
    // Aquí puedes limpiar la selección o refrescar tu inventario/estado

  } catch (error) {
    console.error('Error al registrar venta:', error);
    alert(`Error al registrar venta en Supabase: ${error.message}`);
  }
};
