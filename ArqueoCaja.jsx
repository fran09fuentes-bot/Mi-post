import React, { useState } from 'react';
// Tus componentes existentes
import Dashboard from './components/Dashboard';
import Inventario from './components/Inventario';
import Reportes from './components/Reportes';
// Tu nuevo módulo
import ArqueoCaja from './components/ArqueoCaja';

export default function App() {
  const [vistaActual, setVistaActual] = useState('arqueo'); // estado para cambiar de vista
  const [ventas, setVentas] = useState([]); // tus ventas registradas

  return (
    <div>
      {/* Menú de navegación */}
      <nav className="flex gap-4 p-4 bg-slate-800 text-white">
        <button onClick={() => setVistaActual('dashboard')}>Dashboard</button>
        <button onClick={() => setVistaActual('inventario')}>Inventario</button>
        <button onClick={() => setVistaActual('reportes')}>Reportes</button>
        <button onClick={() => setVistaActual('arqueo')}>Arqueo de Caja</button>
      </nav>

      {/* Renderizado condicional */}
      <main className="p-4">
        {vistaActual === 'dashboard' && <Dashboard />}
        {vistaActual === 'inventario' && <Inventario />}
        {vistaActual === 'reportes' && <Reportes />}
        {vistaActual === 'arqueo' && (
          <ArqueoCaja 
            ventasDelDia={ventas} 
            fondoInicial={50.00} 
            onGuardarCierre={(resumen) => console.log('Cierre guardado:', resumen)} 
          />
        )}
      </main>
    </div>
  );
}
