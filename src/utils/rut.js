export function formatRut(rut) {
    if (!rut) return '';

    // Limpiar el RUT de puntos y guiones
    const cleanRut = rut.replace(/[^0-9kK]/g, '');

    if (cleanRut.length < 2) return cleanRut;

    // Separar cuerpo y dígito verificador
    const cuerpo = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();

    // Formatear el cuerpo con puntos
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${cuerpoFormateado}-${dv}`;
}

export function validateRut(rut) {
    if (!rut) return false;

    const cleanRut = rut.replace(/[^0-9kK]/g, '');

    if (cleanRut.length < 2) return false;

    const cuerpo = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();

    let suma = 0;
    let multiplo = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += multiplo * parseInt(cuerpo.charAt(i), 10);
        multiplo = multiplo < 7 ? multiplo + 1 : 2;
    }

    const mod = 11 - (suma % 11);
    const dvEsperado = mod === 11 ? '0' : mod === 10 ? 'K' : String(mod);

    return dv === dvEsperado;
}