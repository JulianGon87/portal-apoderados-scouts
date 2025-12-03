import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

export default function AccessDenied() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const log = (msg, type = 'info') => {
        setLogs(prev => [...prev, { msg, type, time: new Date().toLocaleTimeString() }]);
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    const verifyAuthUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            log('❌ No hay usuario autenticado en Supabase Auth.', 'error');
            return null;
        }
        log(`✅ Usuario Autenticado: ${user.email} (ID Auth: ${user.id})`, 'success');
        return user;
    };

    const verifyUserRecord = async (user) => {
        const { data: userRecord, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', user.email)
            .single();

        if (userError) {
            log(`❌ Error buscando usuario en tabla 'users': ${userError.message}`, 'error');
            log('HINT: Si RLS está desactivado, esto no debería fallar.', 'info');
        } else if (!userRecord) {
            log('⚠️ El usuario autenticado NO tiene registro en la tabla pública "users".', 'warning');
        } else {
            log(`✅ Usuario encontrado en tabla 'users'. ID: ${userRecord.id}`, 'success');
            log(`   RUT: ${userRecord.rut} | Nombre: ${userRecord.nombre} ${userRecord.apellidos}`, 'info');
        }
    };

    const checkStudentRelationship = async (alumno) => {
        const apoderadoId = alumno.apoderado_id;
        if (!apoderadoId) return '🔴 NULL (Sin ID)';

        const { data: apoderado, error: apodError } = await supabase
            .from('users')
            .select('id, nombre')
            .eq('id', apoderadoId)
            .maybeSingle();

        if (apodError) return `❌ Error DB: ${apodError.message}`;
        if (apoderado) return `🟢 OK (Encontrado: ${apoderado.nombre})`;
        return `⚠️ ID HUÉRFANO (El ID existe en alumno, pero NO en users)`;
    };

    const analyzeStudentsSample = async () => {
        log('--- ANALIZANDO ALUMNOS ---', 'warning');
        const { data: alumnos, error: alumnosError } = await supabase
            .from('alumnos')
            .select('*')
            .limit(10);

        if (alumnosError) {
            log(`❌ Error leyendo alumnos: ${alumnosError.message}`, 'error');
            return;
        }

        log(`Se leyeron ${alumnos.length} alumnos de muestra.`, 'info');

        for (const alumno of alumnos) {
            const status = await checkStudentRelationship(alumno);
            log(`Alumno: ${alumno.nombre} ${alumno.apellidos_alumno} | Apoderado_ID: ${alumno.apoderado_id} -> ${status}`, status.includes('OK') ? 'success' : 'error');
        }
    };

    const verifyTablePermissions = async () => {
        log('--- PRUEBA DE PERMISOS (users) ---', 'warning');
        const { count, error: countError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            log(`❌ Fallo al contar usuarios: ${countError.message}`, 'error');
        } else {
            log(`✅ Acceso OK a tabla users. Total registros: ${count}`, 'success');
        }
    };

    const runDiagnostics = async () => {
        try {
            log('INICIANDO DIAGNÓSTICO DE BASE DE DATOS...', 'warning');

            const user = await verifyAuthUser();
            if (!user) return;

            await verifyUserRecord(user);
            await analyzeStudentsSample();
            await verifyTablePermissions();

        } catch (e) {
            log(`CRITICAL ERROR: ${e.message}`, 'error');
        } finally {
            setLoading(false);
            log('DIAGNÓSTICO FINALIZADO', 'warning');
        }
    };

    return (
        <div className="min-h-screen bg-black text-green-400 p-8 font-mono text-sm overflow-auto">
            <h1 className="text-2xl mb-4 border-b border-green-600 pb-2">SYSTEM DIAGNOSTIC TOOL v1.0</h1>
            <div className="space-y-1">
                {logs.map((l, i) => (
                    <div key={i} className={`${l.type === 'error' ? 'text-red-500 font-bold' : l.type === 'warning' ? 'text-yellow-400' : l.type === 'success' ? 'text-green-300' : 'text-gray-300'}`}>
                        <span className="opacity-50">[{l.time}]</span> {l.msg}
                    </div>
                ))}
                {loading && <div className="animate-pulse mt-4">_ Procesando...</div>}
            </div>
        </div>
    );
}
