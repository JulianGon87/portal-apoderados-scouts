import React from 'react';
import PropTypes from 'prop-types';
import { getTipoLabel, getTipoBadgeColor } from '../utils/itemsHelpers';

/**
 * Tarjeta para mostrar un item de cobro en el portal del apoderado
 */
const ItemCobroCard = ({ item }) => {
    // Por ahora el estado es siempre pendiente hasta la Fase 5


    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getTipoBadgeColor(item.tipo_item)}`}>
                    {getTipoLabel(item.tipo_item)}
                </span>
                <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-100">
                    Pendiente
                </span>
            </div>

            <h4 className="font-bold text-gray-900 mb-1">{item.descripcion}</h4>

            <div className="flex justify-between items-end mt-3">
                <div>
                    <p className="text-xs text-gray-500">Monto</p>
                    <p className="text-lg font-bold text-gray-900">
                        ${item.monto.toLocaleString('es-CL')}
                    </p>
                </div>

                {/* Botón Pagar (Deshabilitado hasta Fase 5) */}
                <button
                    className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded text-sm font-medium cursor-not-allowed"
                    disabled
                    title="El pago en línea estará disponible pronto"
                >
                    Pagar
                </button>
            </div>

            {item.mes && (
                <p className="text-xs text-gray-400 mt-2">
                    Vence: {item.mes}/{item.anio}
                </p>
            )}
        </div>
    );
};

ItemCobroCard.propTypes = {
    item: PropTypes.shape({
        tipo_item: PropTypes.string.isRequired,
        descripcion: PropTypes.string.isRequired,
        monto: PropTypes.number.isRequired,
        mes: PropTypes.number,
        anio: PropTypes.number
    }).isRequired
};

export default ItemCobroCard;
