import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function Historial() {
  const [ventas, setVentas] = useState([]);
  const [filtro, setFiltro] = useState('dia'); // 'dia' o 'mes'

  useEffect(() => {
    obtenerHistorial();
  }, []);

  const obtenerHistorial = async () => {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false });

    if (!error && data) setVentas(data);
  };

  // Agrupar ventas por Día o Mes
  const agruparVentas = () => {
    const grupos = {};

    ventas.forEach((v) => {
      const fechaObj = new Date(v.fecha);
      let clave = '';

      if (filtro === 'dia') {
        clave = fechaObj.toLocaleDateString(); // Formato: DD/MM/YYYY
      } else {
        clave = `${fechaObj.getMonth() + 1}/${fechaObj.getFullYear()}`; // Formato: MM/YYYY
      }

      if (!grupos[clave]) grupos[clave] = { total: 0, lista: [] };
      grupos[clave].lista.push(v);
      grupos[clave].total += Number(v.total);
    });

    return grupos;
  };

  const ventasAgrupadas = agruparVentas();

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#18181b', borderRadius: '8px' }}>
      <h2>Historial de Ventas</h2>

      {/* Selectores de vista por Día o por Mes */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Agrupar por:</label>
        <button
          onClick={() => setFiltro('dia')}
          style={{ padding: '6px 12px', marginRight: '5px', backgroundColor: filtro === 'dia' ? '#2563eb' : '#3f3f46', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          Día
        </button>
        <button
          onClick={() => setFiltro('mes')}
          style={{ padding: '6px 12px', backgroundColor: filtro === 'mes' ? '#2563eb' : '#3f3f46', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          Mes
        </button>
      </div>

      {/* Mostrar ventas agrupadas */}
      {Object.keys(ventasAgrupadas).length === 0 ? (
        <p>No hay ventas registradas aún.</p>
      ) : (
        Object.entries(ventasAgrupadas).map(([periodo, datos]) => (
          <div key={periodo} style={{ marginBottom: '20px', border: '1px solid #3f3f46', padding: '15px', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #52525b', paddingBottom: '5px', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>{filtro === 'dia' ? `Día: ${periodo}` : `Mes: ${periodo}`}</h3>
              <strong style={{ color: '#22c55e' }}>Total: ${datos.total.toFixed(2)}</strong>
            </div>

            {datos.lista.map((v) => (
              <div key={v.id} style={{ fontSize: '14px', padding: '5px 0', borderBottom: '1px dashed #3f3f46' }}>
                <p style={{ margin: '2px 0' }}><strong>Cliente:</strong> {v.cliente || 'General'}</p>
                <p style={{ margin: '2px 0' }}><strong>Descuento:</strong> ${v.descuento}</p>
                <p style={{ margin: '2px 0' }}><strong>Monto:</strong> ${Number(v.total).toFixed(2)}</p>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
