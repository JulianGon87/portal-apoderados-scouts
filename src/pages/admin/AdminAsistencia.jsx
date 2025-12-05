import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/client';
import { useToast } from '../../components/Toast';
import { useAdminAuth } from '../../hooks/useAdminAuth';

export default function AdminAsistencia() {
    const { addToast } = useToast();
    const { user } = useAdminAuth();

    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [unidad, setUnidad] = useState('todos');
    const [alumnos, setAlumnos] = useState([]);
    const [asistencia, setAsistencia] = useState({}); // { alumno_id: 'presente' | 'ausente' | 'justificado' }
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reunionId, setReunionId] = useState(null);

    useEffect(() => {
        if (unidad && fecha) {
            fetchData();
        }
    }, [unidad, fecha]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Cargar alumnos de la unidad
            let query = supabase
                .from('alumnos')
                .select('id, nombre, apellidos_alumno, rut_alumno, seccion')
                .order('apellidos_alumno', { ascending: true });

            if (unidad !== 'todos') {
                query = query.ilike('seccion', unidad);
            }

            const { data: alumnosData, error: alumnosError } = await query;

            if (alumnosError) throw alumnosError;

            setAlumnos(alumnosData || []);

            // 2. Buscar si ya existe una reunión para esta fecha y unidad
            // Si es 'todos', buscamos como 'grupo' en la BD
            const unidadDb = unidad === 'todos' ? 'grupo' : unidad;

            const { data: reunionData, error: reunionError } = await supabase
                .from('reuniones')
                .select('id')
                .eq('fecha', fecha)
                .eq('unidad', unidadDb)
                .maybeSingle();

            if (reunionError) throw reunionError;

            const newAsistencia = {};
            // Inicializar todos como presentes por defecto si es nueva, o cargar si existe
            if (reunionData) {
                setReunionId(reunionData.id);
                const { data: asistenciaData, error: asistenciaError } = await supabase
                    .from('asistencia')
                    .select('alumno_id, estado')
                    .eq('reunion_id', reunionData.id);

                if (asistenciaError) throw asistenciaError;

                asistenciaData.forEach(record => {
                    newAsistencia[record.alumno_id] = record.estado;
                });
            } else {
                setReunionId(null);
                // Por defecto, nadie tiene estado asignado (o todos presentes? mejor dejarlos sin marcar o presentes por defecto)
                // Vamos a dejarlos como 'presente' por defecto para facilitar
                alumnosData.forEach(alumno => {
                    newAsistencia[alumno.id] = 'presente';
                });
            }
            setAsistencia(newAsistencia);

        } catch (error) {
            console.error('Error al cargar datos:', error);
            addToast('Error al cargar datos: ' + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEstadoChange = (alumnoId, estado) => {
        setAsistencia(prev => ({
            ...prev,
            [alumnoId]: estado
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let currentReunionId = reunionId;
            const unidadDb = unidad === 'todos' ? 'grupo' : unidad;

            // 1. Crear reunión si no existe
            if (!currentReunionId) {
                const { data: { user: authUser } } = await supabase.auth.getUser();

                const { data: newReunion, error: createError } = await supabase
                    .from('reuniones')
                    .insert([{
                        fecha,
                        unidad: unidadDb,
                        tipo: 'Reunión Normal',
                        created_by: authUser.id
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                currentReunionId = newReunion.id;
                setReunionId(currentReunionId);
            }

            // 2. Preparar datos de asistencia
            const asistenciaUpserts = alumnos.map(alumno => ({
                reunion_id: currentReunionId,
                alumno_id: alumno.id,
                estado: asistencia[alumno.id] || 'presente'
            }));

            // 3. Guardar asistencia (upsert)
            const { error: upsertError } = await supabase
                .from('asistencia')
                .upsert(asistenciaUpserts, { onConflict: 'reunion_id, alumno_id' });

            if (upsertError) throw upsertError;

            addToast('Asistencia guardada exitosamente', 'success');
        } catch (error) {
            console.error('Error al guardar:', error);
            addToast('Error al guardar: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const getSeccionColor = (seccion) => {
        switch (seccion) {
            case 'todos': return 'text-gray-800 bg-gray-100 border-gray-300';
            case 'manada': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'tropa': return 'text-green-600 bg-green-50 border-green-200';
            case 'compañía': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Control de Asistencia</h1>
                    <p className="text-gray-600 mt-1">Registro de asistencia por sección y fecha</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || loading || alumnos.length === 0}
                    className={`btn-scout flex items-center gap-2 ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                    {saving ? 'Guardando...' : '💾 Guardar Asistencia'}
                </button>
            </div>

            {/* Controles de Selección */}
            <div className="card-glass p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Reunión</label>
                    <input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sección</label>
                    <select
                        value={unidad}
                        onChange={(e) => setUnidad(e.target.value)}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-scout-blue font-medium ${getSeccionColor(unidad)}`}
                    >
                        <option value="todos">Todos</option>
                        <option value="manada">Manada</option>
                        <option value="tropa">Tropa</option>
                        <option value="compañía">Compañía</option>
                    </select>
                </div>
            </div>

            {/* Lista de Alumnos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">
                        Listado de Alumnos ({alumnos.length})
                    </h3>
                    <div className="text-sm text-gray-500">
                        {reunionId ? '📝 Editando asistencia existente' : '✨ Nueva lista de asistencia'}
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-scout-blue mx-auto mb-4"></div>
                        <p className="text-gray-500">Cargando alumnos...</p>
                    </div>
                ) : alumnos.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No hay alumnos registrados en esta unidad.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {alumnos.map((alumno) => (
                            <div key={alumno.id} className="p-4 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm
                                        ${unidad === 'manada' ? 'bg-yellow-400' :
                                            unidad === 'tropa' ? 'bg-green-500' :
                                                unidad === 'compañía' ? 'bg-blue-500' :
                                                    unidad === 'avanzada' ? 'bg-red-500' : 'bg-purple-500'}`}
                                    >
                                        {alumno.nombre.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900">{alumno.nombre} {alumno.apellidos_alumno}</p>
                                        <p className="text-sm text-gray-500">
                                            {alumno.rut_alumno}
                                            {unidad === 'todos' && (
                                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getSeccionColor(alumno.seccion.toLowerCase()).replace('text-', 'text-xs text-').replace('bg-', 'bg-opacity-50 bg-')}`}>
                                                    {alumno.seccion}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
                                    <button
                                        onClick={() => handleEstadoChange(alumno.id, 'presente')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${asistencia[alumno.id] === 'presente'
                                            ? 'bg-white text-green-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Presente
                                    </button>
                                    <button
                                        onClick={() => handleEstadoChange(alumno.id, 'ausente')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${asistencia[alumno.id] === 'ausente'
                                            ? 'bg-white text-red-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Ausente
                                    </button>
                                    <button
                                        onClick={() => handleEstadoChange(alumno.id, 'justificado')}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${asistencia[alumno.id] === 'justificado'
                                            ? 'bg-white text-orange-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        Justificado
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
