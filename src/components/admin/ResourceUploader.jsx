import React, { useState } from 'react';
import { supabase } from '../../supabase/client';

const ResourceUploader = ({ onSuccess, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        titulo: '',
        descripcion: '',
        tipo: 'ficha',
        unidad: 'general',
        archivo: null
    });

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tamaño (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert('El archivo es demasiado pesado (Max 10MB)');
                return;
            }
            setFormData({ ...formData, archivo: file });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.archivo) {
            alert('Por favor selecciona un archivo');
            return;
        }

        try {
            setLoading(true);

            // 1. Subir archivo al Storage
            // Sanitizar nombre de archivo y carpeta (remover tildes, ñ, espacios)
            const sanitize = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ñ/g, "n").replace(/Ñ/g, "N").replace(/[^a-zA-Z0-9._-]/g, "_");

            const fileExt = formData.archivo.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const folderName = sanitize(formData.unidad); // compañia -> compania

            const filePath = `${folderName}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('recursos')
                .upload(filePath, formData.archivo);

            if (uploadError) throw uploadError;

            // 2. Obtener URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('recursos')
                .getPublicUrl(filePath);

            // 3. Guardar en Base de Datos
            const { error: dbError } = await supabase
                .from('recursos_educativos')
                .insert([{
                    titulo: formData.titulo,
                    descripcion: formData.descripcion,
                    tipo: formData.tipo,
                    unidad: formData.unidad,
                    url_archivo: publicUrl,
                    // created_by se asigna automáticamente por trigger o RLS si se configura,
                    // pero aquí lo pasaremos explícitamente si tenemos el user ID, 
                    // o dejaremos que el backend lo maneje si hay trigger.
                    // Como no hay trigger, Supabase Auth lo vincula si usamos auth.uid() en la policy,
                    // pero para el campo created_by necesitamos el ID.
                }]);

            if (dbError) throw dbError;

            alert('Recurso subido exitosamente');
            onSuccess();

        } catch (error) {
            console.error('Error subiendo recurso:', error);
            alert('Error al subir el recurso: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                    placeholder="Ej: Manual de Nudos"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                    rows="3"
                    value={formData.descripcion}
                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                    placeholder="Breve descripción del contenido..."
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                    <select
                        value={formData.tipo}
                        onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                    >
                        <option value="ficha">Ficha Técnica (PDF/Img)</option>
                        <option value="cancion">Canción</option>
                        <option value="video">Video</option>
                        <option value="otro">Otro</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad Objetivo</label>
                    <select
                        value={formData.unidad}
                        onChange={e => setFormData({ ...formData, unidad: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-scout-blue"
                    >
                        <option value="general">General (Todos)</option>
                        <option value="manada">Manada</option>
                        <option value="tropa">Tropa</option>
                        <option value="compañia">Compañía</option>
                        <option value="avanzada">Avanzada</option>
                        <option value="clan">Clan</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Archivo</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-scout-blue transition-colors">
                    <div className="space-y-1 text-center">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="flex text-sm text-gray-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-scout-blue hover:text-blue-500 focus-within:outline-none">
                                <span>Subir un archivo</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">o arrastrar y soltar</p>
                        </div>
                        <p className="text-xs text-gray-500">
                            {formData.archivo ? `Seleccionado: ${formData.archivo.name}` : 'PDF, PNG, JPG hasta 10MB'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-scout-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                            Subiendo...
                        </>
                    ) : (
                        'Guardar Recurso'
                    )}
                </button>
            </div>
        </form>
    );
};

export default ResourceUploader;
