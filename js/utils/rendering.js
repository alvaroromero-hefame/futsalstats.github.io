/**
 * Rendering - Funciones de renderizado reutilizables
 */

/**
 * Renderiza el selector de días (Martes/Jueves)
 * @param {string} currentDay - Día actual seleccionado
 * @returns {string} HTML del selector
 */
export function renderDaySelector(currentDay, idPrefix = '') {
    return `
        <div class="day-selector">
            <button id="btn-martes${idPrefix}" class="${currentDay === 'martes' ? 'active' : ''}">
                Martes
            </button>
            <button id="btn-jueves${idPrefix}" class="${currentDay === 'jueves' ? 'active' : ''}">
                Jueves
            </button>
        </div>
    `;
}

/**
 * Formatea una fecha del formato YYYY-MM-DD a formato local
 * @param {string} dateString - Fecha en formato string
 * @returns {string} Fecha formateada
 */
export function formatDate(dateString) {
    let fechaObj;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        // Formato YYYY-MM-DD
        const [y, m, d] = dateString.split('-');
        fechaObj = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
        // Otros formatos
        fechaObj = new Date(dateString);
    }
    return isNaN(fechaObj) ? dateString : fechaObj.toLocaleDateString();
}

/**
 * Renderiza el detalle de un partido (lineup)
 * @param {Object} match - Datos del partido
 * @param {Array} fijos - Lista de jugadores fijos
 * @returns {string} HTML del detalle
 */
export function renderDetallePartido(match, fijos = []) {
    let html = `<h3>Lineup</h3><div class="lineup-container">`;
    
    // Detectar estructura de datos
    let blueLineup, redLineup;
    if (match.blue_lineup && match.red_lineup) {
        // Estructura de Supabase (plana)
        blueLineup = match.blue_lineup;
        redLineup = match.red_lineup;
    } else if (match.teams && match.teams[0]) {
        // Estructura antigua (anidada)
        blueLineup = match.teams[0].blue[0].lineup[0].member;
        redLineup = match.teams[0].red[0].lineup[0].member;
    } else {
        return '<p>Error: estructura de partido no reconocida</p>';
    }
    
    // Equipo azul
    html += `<div class="lineup-team blue-team"><h4>Azul</h4><ul>`;
    blueLineup.forEach(m => {
        let fijoIcon = fijos.includes(m.name) ? ' ⭐' : '';
        const goles = m.goal !== undefined ? m.goal : (m.goles || 0);
        const asistencias = m.assist !== undefined ? m.assist : (m.asistencias || 0);
        const encajados = m.keeper !== undefined ? m.keeper : (m.portero || 0);
        html += `<li>${m.name}${fijoIcon} (Goles: ${goles}, Asistencias: ${asistencias}, Encajados: ${encajados})</li>`;
    });
    html += `</ul></div>`;
    
    // Equipo rojo
    html += `<div class="lineup-team red-team"><h4>Rojo</h4><ul>`;
    redLineup.forEach(m => {
        let fijoIcon = fijos.includes(m.name) ? ' ⭐' : '';
        const goles = m.goal !== undefined ? m.goal : (m.goles || 0);
        const asistencias = m.assist !== undefined ? m.assist : (m.asistencias || 0);
        const encajados = m.keeper !== undefined ? m.keeper : (m.portero || 0);
        html += `<li>${m.name}${fijoIcon} (Goles: ${goles}, Asistencias: ${asistencias}, Encajados: ${encajados})</li>`;
    });
    html += `</ul></div>`;
    
    html += `</div>`;
    return html;
}

/**
 * Renderiza una lista de elementos
 * @param {Array} items - Array de items a renderizar
 * @returns {string} HTML de la lista
 */
export function renderList(items) {
    if (!items || items.length === 0) {
        return '<li>No hay datos</li>';
    }
    
    return items.map(item => `<li>${item}</li>`).join('');
}

/**
 * Renderiza el gráfico de victorias (texto con colores)
 * @param {Object} victorias - Objeto con {blue: number, red: number}
 * @returns {string} HTML del gráfico
 */
export function renderGraficoVictorias(victorias) {
    const victoriasTexto = `<span style='color: #36a2eb;'>${victorias.blue}</span> - <span style='color: #ff6384;'>${victorias.red}</span>`;
    return `<p style='font-size: 2.5em; font-weight: bold; text-align: center;'>${victoriasTexto}</p>`;
}

/**
 * Renderiza la leyenda de la clasificación
 * @returns {string} HTML de la leyenda
 */
export function renderLeyendaClasificacion() {
    return `
        <div class="leyenda-clasificacion">
            <h3>Criterios de puntuación</h3>
            <ul>
                <li>Victoria: +3 puntos a cada jugador del equipo ganador</li>
                <li>Empate: +1 punto a cada jugador de ambos equipos</li>
                <li>Gol marcado: +0.25 puntos por cada gol</li>
                <li>Asistencia: +0.25 puntos por cada asistencia</li>
                <li>Gol encajado: -0.10 puntos a cada jugador del equipo por cada gol encajado</li>
                <li>MVP: +1 punto adicional por cada vez que ha sido MVP</li>
                <li>⭐ Jugador fijo</li>
                <li>⚽ Próximo seleccionador</li>
            </ul>
        </div>
    `;
}
