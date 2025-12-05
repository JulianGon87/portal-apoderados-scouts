import React, { useState } from 'react';
import { useFinancials } from '../../hooks/useFinancials';
import StatsCard from '../../components/admin/StatsCard';
import { supabase } from '../../supabase/client';

const SECTIONS = ['manada', 'tropa', 'compañia', 'avanzada', 'clan'];
const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ResumenFinanciero = () => {
    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        section: 'todas'
    });

    const { loading, summary, movements, addMovement } = useFinancials(filters);
    const [showModal, setShowModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        tipo: 'ingreso',
        monto: '',
        descripcion: '',
        seccion: 'grupo',
        fecha: new Date().toISOString().split('T')[0],
        comprobante: null
    });

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setFormData(prev => ({ ...prev, comprobante: e.target.files[0] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            let comprobante_url = null;

            if (formData.comprobante) {
                const fileExt = formData.comprobante.name.split('.').pop();
                const fileName = `finanzas-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('comprobantes')
                    .upload(fileName, formData.comprobante);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('comprobantes')
                    .getPublicUrl(fileName);

                comprobante_url = publicUrl;
            }

            await addMovement({
                tipo: formData.tipo,
                monto: Number(formData.monto),
                descripcion: formData.descripcion,
                seccion: formData.seccion,
                fecha: formData.fecha,
                comprobante_url
            });

            setShowModal(false);
            setFormData({
                tipo: 'ingreso',
                monto: '',
                descripcion: '',
                seccion: 'grupo',
                fecha: new Date().toISOString().split('T')[0],
                comprobante: null
            });
            alert('Movimiento registrado exitosamente');

        } catch (error) {
            console.error('Error:', error);
            alert('Error al registrar movimiento: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Resumen Financiero</h1>
                    <p className="text-gray-600">Gestión de ingresos y egresos del grupo</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={filters.year}
                        onChange={(e) => handleFilterChange('year', Number(e.target.value))}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select
                        value={filters.month}
                        onChange={(e) => handleFilterChange('month', Number(e.target.value))}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>

                    <select
                        value={filters.section}
                        onChange={(e) => handleFilterChange('section', e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm capitalize"
                    >
                        <option value="todas">Todas las Secciones</option>
                        {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    <button
                        onClick={() => setShowModal(true)}
                        className="bg-scout-blue text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        <span>+</span> Registrar Movimiento
                    </button>
                </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatsCard
                    title="Total Ingresos"
                    value={`$${summary.totalIngresos.toLocaleString('es-CL')}`}
                    icon="💰"
                    color="green"
                    subtitle={`Portal: $${summary.ingresosPortal.toLocaleString()} | Extra: $${summary.ingresosExtra.toLocaleString()}`}
                />
                <StatsCard
                    title="Total Egresos"
                    value={`$${summary.totalEgresos.toLocaleString('es-CL')}`}
                    icon="💸"
                    color="red"
                    subtitle="Gastos registrados"
                />
                <StatsCard
                    title="Balance Actual"
                    value={`$${summary.balance.toLocaleString('es-CL')}`}
                    icon="⚖️"
                    color={summary.balance >= 0 ? 'blue' : 'red'}
                    subtitle={summary.balance >= 0 ? 'Superávit' : 'Déficit'}
                />
            </div>

            {/* Movements Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-700">Movimientos Registrados</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-4 py-3">Fecha</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Descripción</th>
                                <th className="px-4 py-3">Sección</th>
                                <th className="px-4 py-3 text-right">Monto</th>
                                <th className="px-4 py-3 text-center">Comprobante</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="p-4 text-center">Cargando...</td></tr>
                            ) : movements.length === 0 ? (
                                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No hay movimientos registrados en este periodo.</td></tr>
                            ) : (
                                movements.map((mov) => (
                                    <tr key={mov.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">{new Date(mov.fecha).toLocaleDateString('es-CL')}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${mov.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{mov.descripcion}</td>
                                        <td className="px-4 py-3 capitalize">{mov.seccion}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                            ${mov.monto.toLocaleString('es-CL')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {mov.comprobante_url ? (
                                                <a href={mov.comprobante_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                                    📎 Ver
                                                </a>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">Registrar Movimiento</h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Tipo</label>
                                    <select
                                        name="tipo"
                                        value={formData.tipo}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg p-2"
                                    >
                                        <option value="ingreso">Ingreso Adicional</option>
                                        <option value="egreso">Egreso (Gasto)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha</label>
                                    <input
                                        type="date"
                                        name="fecha"
                                        value={formData.fecha}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg p-2"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Monto</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        name="monto"
                                        value={formData.monto}
                                        onChange={handleInputChange}
                                        className="w-full border rounded-lg pl-7 p-2"
                                        placeholder="0"
                                        min="1"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Descripción</label>
                                <input
                                    type="text"
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-lg p-2"
                                    placeholder="Ej: Venta de completos, Compra materiales..."
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Sección</label>
                                <select
                                    name="seccion"
                                    value={formData.seccion}
                                    onChange={handleInputChange}
                                    className="w-full border rounded-lg p-2 capitalize"
                                >
                                    <option value="grupo">Grupo (General)</option>
                                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Comprobante (Opcional)</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    accept="image/*,.pdf"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {submitting ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResumenFinanciero;
