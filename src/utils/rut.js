// src/utils/rut.js

// Implementación de la validación de RUT chileno
// Espera el RUT en formato con o sin guion (ej: 12345678-K o 12345678K)
export function validarRut(rutConGuion) {
    if (!rutConGuion) return false
    
    // 1. Limpia el RUT (solo dígitos y 'K'/'k')
    const rut = String(rutConGuion).replace(/\./g,'').replace(/-/g,'').toUpperCase()
    
    // 2. Separa el cuerpo y el dígito verificador (DV)
    const cuerpo = rut.slice(0, -1)
    const dv = rut.slice(-1)
    
    if (cuerpo.length < 7) return false
    
    // 3. Cálculo del DV esperado (Algoritmo Módulo 11)
    let suma = 0
    let multiplo = 2
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(cuerpo.charAt(i), 10)
        multiplo = multiplo < 7 ? multiplo + 1 : 2
    }
    const mod = 11 - (suma % 11)
    let dvEsperado = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod)
    
    // 4. Comparación
    return dvEsperado === dv
}

// Función auxiliar para formatear el RUT (útil para UX en el formulario)
export function formatRut(rutSinFormato) {
    if (!rutSinFormato) return ''
    const rut = String(rutSinFormato).replace(/\D/g, '')
    const cuerpo = rut.slice(0, -1)
    const dv = rut.slice(-1)
    if (!cuerpo) return rut
    return `${cuerpo}-${dv}`
}