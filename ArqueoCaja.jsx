import React, { useState, useEffect } from 'react';

export default function ArqueoCaja({ fondoInicial = 50.00 }) {
  // Claves para el localStorage
  const STORAGE_GASTOS_KEY = 'mi_pos_gastos';
  const STORAGE_VENTAS_KEY = 'mi_pos_ventas';

  // Estados
  const [gastos, setGastos] = useState([]);
  const [ventasDelDia, setVentasDelDia] = useState([]);

  // Campos del Formulario
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [tipoGasto, setTipoGasto] = useState('OPERATIVO'); // 'OPERATIVO' o 'REINVERSION'

  // 1. CARGAR DATOS DE LOCALSTORAGE AL INICIAR
  useEffect(() => {
    const gastosGuardados = localStorage.getItem(STORAGE_GASTOS_KEY);
    if (gastosGuardados) {
      try {
        setGastos(JSON.parse(gastosGuardados));
      } catch (e) {
        console.error('Error al leer gastos de localStorage', e);
      }
    }

    const ventasGuardadas = localStorage.getItem(STORAGE_VENTAS_KEY);
    if (ventasGuardadas) {
      try {
        setVentasDelDia(JSON.parse(ventasGuardadas));
      } catch (e) {
        console.error('Error al leer ventas de localStorage', e);
      }
    }
  }, []);

  // 2. REGISTRAR Y GUARDAR UN NUEVO GASTO / REINVERSIÓN
  const handleAgregarGasto = (e) => {
    e.preventDefault();
    if (!concepto || !monto || parseFloat(monto) <= 0) return;

    const nuevoGasto = {
      id: Date.now(),
      concepto,
      monto: parseFloat(monto),
      tipo: tipoGasto, // 'OPERATIVO' o 'REINVERSION'
      fecha: new Date().toLocaleDateString('es-SV')
    };

    const listaActualizada = [nuevoGasto, ...gastos];
    
    // Actualizar Estado
    setGastos(listaActualizada);

    // Guardar permanentemente en localStorage
    localStorage.setItem(STORAGE_GASTOS_KEY, JSON.stringify(listaActualizada));

    // Reset de campos
    setConcepto('');
    setMonto('');
    setTipoGasto('OPERATIVO');
  };

  // 3. ELIMINAR UN GASTO / REINVERSIÓN
  const handleElimINARGasto = (idGasto, conceptoGasto) => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar "${conceptoGasto}"?`);
    if (!confirmar) return;

    // Filtrar para quitar el elemento borrado
    const listaFiltrada = gastos.filter((item) => item.id !== idGasto);

    // Actualizar estado y localStorage
    setGastos(listaFiltrada);
    localStorage.setItem(STORAGE_GASTOS_KEY, JSON.stringify(listaFiltrada));
  };

  // 4. CÁLCULOS FINANCIEROS
  const totalVentasBrutas = ventasDelDia.reduce((acc, v) => acc + Number(v.total || v.monto || 0), 0);

  // Gastos Fijos / Operativos ÚNICAMENTE (Resta de Ganancia Neta)
  const totalGastosFijos = gastos
    .filter((g) => g.tipo === 'OPERATIVO' || (!g.tipo && !g.es_reinversion))
    .reduce((acc, g) => acc + Number(g.monto), 0);

  // Fondo de Reinversión (NO resta de Ganancia Neta)
  const totalReinversion = gastos
    .filter((g) => g.tipo === 'REINVERSION' || g.es_reinversion)
    .reduce((acc, g) => acc + Number(g.monto), 0);

  // Ganancia Neta
  const gananciaNeta = totalVentasBrutas - totalGastosFijos;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* TARJETAS DE RESUMEN SUPERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ganancia Neta */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase">
            📈 Ganancia Neta
          </span>
          <div className={`text-3xl font-extrabold mt-1 ${gananciaNeta < 0 ? 'text-red-500' : 'text-slate-800'}`}>
            ${gananciaNeta.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Utilidad real (menos gastos operativos)</p>
        </div>

        {/* Reinversión */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
            📦 Reinversión
          </span>
          <div className="text-3xl font-extrabold text-slate-800 mt-1">
            ${totalReinversion.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Fondo reposición (No resta ganancia)</p>
        </div>
      </div>

      {/* METRICAS SECUNDARIAS */}
      <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-around text-center">
        <div>
          <p className="text-xs text-slate-400">Ventas Brutas</p>
          <p className="text-lg font-bold">${totalVentasBrutas.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Gastos Fijos</p>
          <p className="text-lg font-bold text-red-400">${totalGastosFijos.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Ventas Reg.</p>
          <p className="text-lg font-bold text-emerald-400">{ventasDelDia.length}</p>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-md font-bold text-slate-800 uppercase tracking-wide mb-4">
          Registrar Gasto Fijo / Operativo
        </h3>

        <form onSubmit={handleAgregarGasto} className="space-y-4">
          {/* Selector Operativo vs Reinversión */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                tipoGasto === 'OPERATIVO'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500'
              }`}
              onClick={() => setTipoGasto('OPERATIVO')}
            >
              Gasto Operativo
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                tipoGasto === 'REINVERSION'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500'
              }`}
              onClick={() => setTipoGasto('REINVERSION')}
            >
              Reinversión (Stock)
            </button>
          </div>

          <input
            type="text"
            placeholder="Concepto (ej. Alquiler, Inversión productos)"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none"
            required
          />

          <input
            type="number"
            step="0.01"
            placeholder="Monto ($)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none"
            required
          />

          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md"
          >
            Registrar Gasto
          </button>
        </form>
      </div>

      {/* HISTORIAL LOCAL CON BOTÓN DE ELIMINAR */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-md font-bold text-slate-800 uppercase tracking-wide mb-4">
          Lista de Gastos
        </h3>

        {gastos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No hay registros guardados en el dispositivo.</p>
        ) : (
          <div className="space-y-2">
            {gastos.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-800">{item.concepto}</p>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                      item.tipo === 'REINVERSION' || item.es_reinversion
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.tipo === 'REINVERSION' || item.es_reinversion ? 'Reinversión' : 'Gasto Fijo'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-red-500">
                    -${Number(item.monto).toFixed(2)}
                  </span>

                  {/* Botón para Borrar Registro */}
                  <button
                    onClick={() => handleElimINARGasto(item.id, item.concepto)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar gasto"
                    type="button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
