import React, { useState, useEffect } from 'react';

export default function ArqueoCaja() {
  const STORAGE_GASTOS_KEY = 'mi_pos_gastos';
  const STORAGE_VENTAS_KEY = 'mi_pos_ventas';

  const [gastos, setGastos] = useState([]);
  const [ventasDelDia, setVentasDelDia] = useState([]);

  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [tipoGasto, setTipoGasto] = useState('OPERATIVO');

  useEffect(() => {
    const gastosGuardados = localStorage.getItem(STORAGE_GASTOS_KEY);
    if (gastosGuardados) {
      try {
        setGastos(JSON.parse(gastosGuardados));
      } catch (e) {
        console.error('Error al cargar gastos:', e);
      }
    }

    const ventasGuardadas = localStorage.getItem(STORAGE_VENTAS_KEY);
    if (ventasGuardadas) {
      try {
        setVentasDelDia(JSON.parse(ventasGuardadas));
      } catch (e) {
        console.error('Error al cargar ventas:', e);
      }
    }
  }, []);

  const handleAgregarGasto = (e) => {
    e.preventDefault();
    if (!concepto || !monto || parseFloat(monto) <= 0) return;

    const hoy = new Date();
    const fechaFormateada = `${hoy.getDate()}/${hoy.getMonth() + 1}/${hoy.getFullYear()}`;

    const nuevoGasto = {
      id: Date.now(),
      concepto: `${concepto} (${fechaFormateada})`,
      monto: parseFloat(monto),
      tipo: tipoGasto,
    };

    const nuevaLista = [nuevoGasto, ...gastos];
    setGastos(nuevaLista);
    localStorage.setItem(STORAGE_GASTOS_KEY, JSON.stringify(nuevaLista));

    setConcepto('');
    setMonto('');
    setTipoGasto('OPERATIVO');
  };

  const handleEliminarGasto = (idGasto, conceptoGasto) => {
    if (window.confirm(`¿Quieres eliminar "${conceptoGasto}"?`)) {
      const listaFiltrada = gastos.filter((item) => item.id !== idGasto);
      setGastos(listaFiltrada);
      localStorage.setItem(STORAGE_GASTOS_KEY, JSON.stringify(listaFiltrada));
    }
  };

  const totalVentasBrutas = ventasDelDia.reduce((acc, v) => acc + Number(v.total || v.monto || 0), 0);

  const totalGastosFijos = gastos
    .filter((g) => g.tipo === 'OPERATIVO' || (!g.tipo && !g.es_reinversion))
    .reduce((acc, g) => acc + Number(g.monto), 0);

  const totalReinversion = gastos
    .filter((g) => g.tipo === 'REINVERSION' || g.es_reinversion)
    .reduce((acc, g) => acc + Number(g.monto), 0);

  const gananciaNeta = totalVentasBrutas - totalGastosFijos;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 uppercase">📈 Ganancia Neta</span>
          <div className="text-2xl font-extrabold text-slate-800">
            ${gananciaNeta.toFixed(2)}
          </div>
          <p className="text-[10px] text-slate-400">Utilidad real (menos gastos)</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <span className="text-[11px] font-bold text-blue-600 uppercase">📦 Reinversión</span>
          <div className="text-2xl font-extrabold text-slate-800">${totalReinversion.toFixed(2)}</div>
          <p className="text-[10px] text-slate-400">Fondo reposición (No tocar)</p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-3 rounded-xl flex justify-between text-center text-xs">
        <div>
          <p className="text-slate-400">Ventas Brutas</p>
          <p className="font-bold text-sm">${totalVentasBrutas.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400">Gastos Fijos</p>
          <p className="font-bold text-sm text-red-400">${totalGastosFijos.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-slate-400">Ventas Reg.</p>
          <p className="font-bold text-sm text-emerald-400">{ventasDelDia.length}</p>
        </div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
          Registrar Gasto Fijo / Operativo
        </h3>

        <form onSubmit={handleAgregarGasto} className="space-y-3">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              className={`flex-1 py-1.5 font-bold rounded-md transition-all ${
                tipoGasto === 'OPERATIVO' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
              onClick={() => setTipoGasto('OPERATIVO')}
            >
              Gasto Operativo
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 font-bold rounded-md transition-all ${
                tipoGasto === 'REINVERSION' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'
              }`}
              onClick={() => setTipoGasto('REINVERSION')}
            >
              Reinversión
            </button>
          </div>

          <input
            type="text"
            placeholder="Concepto (ej. Alquiler, Internet, Publicidad)"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none"
            required
          />

          <input
            type="number"
            step="0.01"
            placeholder="Monto ($)"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none"
            required
          />

          <button
            type="submit"
            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm shadow-sm"
          >
            Registrar Gasto
          </button>
        </form>
      </div>

      <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3">
          Lista de Gastos
        </h3>

        {gastos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">No hay gastos registrados.</p>
        ) : (
          <div className="space-y-2">
            {gastos.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-700">{item.concepto}</p>
                  <span
                    className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                      item.tipo === 'REINVERSION'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {item.tipo === 'REINVERSION' ? 'Reinversión' : 'Gasto Operativo'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-red-500">-${Number(item.monto).toFixed(2)}</span>

                  <button
                    onClick={() => handleEliminarGasto(item.id, item.concepto)}
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Borrar gasto"
                    type="button"
                  >
                    🗑️
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
