import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Ventas() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [cliente, setCliente] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [mensaje, setMensaje] = useState('');

  // Cargar productos desde Supabase
  useEffect(() => {
    obtenerProductos();
  }, []);

  const obtenerProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*');
    if (!error && data) setProductos(data);
  };

  // Filtrar productos por nombre
  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const agregarAlCarrito = (producto) => {
    const existe = carrito.find((item) => item.id === producto.id);
    if (existe) {
      setCarrito(
        carrito.map((item) =>
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  const subtotal = carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const total = Math.max(0, subtotal - Number(descuento));

  const registrarVenta = async () => {
    if (carrito.length === 0) return alert('El carrito está vacío');

    const { error } = await supabase.from('ventas').insert([
      {
        cliente: cliente || 'Cliente General',
        descuento: Number(descuento),
        total: total,
        detalles_productos: carrito,
      },
    ]);

    if (error) {
      setMensaje('Error al guardar la venta: ' + error.message);
    } else {
      setMensaje('¡Venta registrada con éxito en Supabase!');
      setCarrito([]);
      setCliente('');
      setDescuento(0);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#18181b', borderRadius: '8px' }}>
      <h2>Registrar Venta</h2>

      {/* Buscador de productos */}
      <div style={{ marginBottom: '15px' }}>
        <label>Buscar Producto por Nombre:</label>
        <input
          type="text"
          placeholder="Escribe el nombre del producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', color: '#000' }}
        />
      </div>

      {/* Lista de productos filtrados */}
      <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '20px', border: '1px solid #3f3f46', padding: '10px' }}>
        {productosFiltrados.map((p) => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>{p.nombre} - ${p.precio}</span>
            <button onClick={() => agregarAlCarrito(p)} style={{ cursor: 'pointer' }}>Agregar</button>
          </div>
        ))}
      </div>

      {/* Carrito de Compras */}
      <h3>Carrito</h3>
      {carrito.map((item) => (
        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
          <span>{item.nombre} (x{item.cantidad})</span>
          <span>${(item.precio * item.cantidad).toFixed(2)}</span>
        </div>
      ))}

      {/* Datos del Cliente y Descuento */}
      <div style={{ marginTop: '15px', borderTop: '1px solid #3f3f46', paddingTop: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>Nombre del Cliente / Envío:</label>
          <input
            type="text"
            placeholder="Ej. María López"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', color: '#000' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Descuento ($):</label>
          <input
            type="number"
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
            style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', color: '#000' }}
          />
        </div>

        <h4>Total a pagar: ${total.toFixed(2)}</h4>

        <button
          onClick={registrarVenta}
          style={{ padding: '10px 20px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', width: '100%' }}
        >
          Confirmar y Guardar Venta
        </button>

        {mensaje && <p style={{ marginTop: '10px', color: '#22c55e' }}>{mensaje}</p>}
      </div>
    </div>
  );
}
