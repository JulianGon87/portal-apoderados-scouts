// src/utils/rut.js

// Función para validar el RUT
export function validarRut(rutSinFormato) {
    if (!rutSinFormato) return false;
    const rut = String(rutSinFormato).replace(/\./g, '').replace(/-/g, '').toUpperCase();
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    if (cuerpo.length < 7) return false;

    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(cuerpo.charAt(i), 10);
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }
    const mod = 11 - (suma % 11);
    let dvEsperado = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod);

    return dvEsperado === dv;
}

// Función para formatear el RUT (la dejaremos pendiente como dijiste)
export function formatRut(value) {
    // (Pendiente: Arreglar el formateo en vivo)
    return value.replace(/[^0-9kK.-]/g, ''); // Por ahora, solo limpia caracteres no válidos
}