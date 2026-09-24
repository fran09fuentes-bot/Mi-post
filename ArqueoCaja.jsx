import React, { useState } from 'react';

export default function ArqueoCaja({ ventasDelDia = [], fondoInicial = 50.00, onGuardarCierre }) {
  // Lista de gastos registrados en el día/turno
  const [gastos, setGastos] = useState([]);
  
  // Campos del formulario
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [tipoGasto, setTipoGasto] = useState('OPERATIVO'); // 'OPERATIVO' o 'REINVERSION'

  // 1. Agregar nuevo gasto/reinversión
  const handleAgregarGasto = (e) => {
    e.preventDefault();
    if (!concepto || !monto || parseFloat(monto) <= 0) return;

    const nuevoGasto = {
      id: Date.now(),
      concepto,
      monto: parseFloat(monto),
      tipo: tipoGasto, // Almacena si es Operativo o Reinversión
      fecha: new Date().toLocaleDateString('es-SV'),
    };

    setGastos([...gastos, nuevoGasto]);
    setConcepto('');
    setMonto('');
    setTipoGasto('OPERATIVO'); // Reset al valor por defecto
  };

  // 2. Cálculos Financieros Separados

  // Suma total de Ventas Brutas
  const totalVentasBrutas = ventasDelDia.reduce((acc, v) => acc + (v.total || v.monto || 0), 0);

  // Gastos Fijos / Operativos ÚNICAMENTE (Alquiler, Servicios, Publicidad, etc.)
  const totalGastosFijos = gastos
    .filter((g) => g.tipo === 'OPERATIVO')
    .reduce((acc, g) => acc + g.monto, 0);

  // Reinversiones / Fondo de Reposición (Stock, Mercadería)
  const totalReinversion = gastos
    .filter((g) => g.tipo === 'REINVERSION')
    .reduce((acc, g) => acc + g.monto, 0);

  // Ganancia Neta = Ventas Brutas - Gastos Operativos (NO resta la Reinversión)
  const gananciaNeta = totalVentasBrutas - totalGastosFijos;

  // Fondo en Caja Actual = Fondo Inicial + Ventas Brutas - Gastos Totales
  const dineroEnCaja = fondoInicial + totalVentasBrutas - totalGastosFijos - totalReinversion;

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
          <p className="text-xs text-slate-400 mt-1">Utilidad real (Ventas - Gastos Fijos)</p>
        </div>

        {/* Reinversión / Fondo Reposición */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <span className="text-xs font-bold tracking-wider text-blue-600 uppercase">
            📦 Reinversión / Reposición
          </span>
          <div className="text-3xl font-extrabold text-slate-800 mt-1">
            ${totalReinversion.toFixed(2)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Fondo asignado a stock/compras (No afecta utilidad)</p>
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
          <p className="text-xs text-slate-400">Ventas Registradas</p>
          <p className="text-lg font-bold text-emerald-400">{ventasDelDia.length}</p>
        </div>
      </div>

      {/* FORMULARIO DE REGISTRO */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-md font-bold text-slate-800 uppercase tracking-wide mb-4">
          Registrar Gasto o Reinversión
        </h3>

        <form onSubmit={handleAgregarGasto} className="space-y-4">
          {/* Selector de Tipo de Movimiento */}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                tipoGasto === 'OPERATIVO'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setTipoGasto('OPERATIVO')}
            >
              Gasto Operativo / Fijo
            </button>
            <button
              type="button"
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
                tipoGasto === 'REINVERSION'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
              onClick={() => setTipoGasto('REINVERSION')}
            >
              Reinversión (Stock)
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Concepto (ej. Inversión productos, Alquiler, Publicidad)"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <input
              type="number"
              step="0.01"
              placeholder="Monto ($)"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-md"
          >
            Registrar Entrada
          </button>
        </form>
      </div>

      {/* HISTORIAL / LISTA DE GASTOS Y REINVERSIONES */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-md font-bold text-slate-800 uppercase tracking-wide mb-4">
          Lista de Gastos y Movimientos
        </h3>

        {gastos.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No hay movimientos registrados hoy.</p>
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
                      item.tipo === 'REINVERSION'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.tipo === 'REINVERSION' ? 'Reinversión' : 'Gasto Fijo'}
                  </span>
                </div>
                <span className="text-sm font-bold text-red-500">-${item.monto.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
