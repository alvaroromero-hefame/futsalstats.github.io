/**
 * HistoricoView - Vista de histórico de partidos
 */
import { getResultado, getAllMembers } from '../utils/calculations.js';
import { formatDate, renderDetallePartido } from '../utils/rendering.js';

export class HistoricoView {
    constructor(dataManager, container) {
        this.dataManager = dataManager;
        this.container = container;
    }

    /**
     * Renderiza la vista de histórico
     */
    render() {
        const data = this.dataManager.getCurrentData();
        if (!data) {
            this.container.innerHTML = '<p>Cargando datos...</p>';
            return;
        }

        const matches = data.matches;
        const currentDay = this.dataManager.getCurrentDay();

        this.container.innerHTML = `
            <h2>Histórico</h2>
            <div class="filters">
                <select id="filter-dia">
                    <option value="todos">Todos los días</option>
                    <option value="martes" ${currentDay === 'martes' ? 'selected' : ''}>Martes</option>
                    <option value="jueves" ${currentDay === 'jueves' ? 'selected' : ''}>Jueves</option>
                </select>
                <input type="date" id="filter-fecha" placeholder="Fecha">
                <input type="text" id="filter-mvp" placeholder="MVP">
                <input type="text" id="filter-lineup" placeholder="Integrante">
                <button id="filter-btn">Buscar</button>
            </div>
            <div id="historico-table"></div>
            <div id="detalle-match"></div>
        `;

        this.renderTable(matches);
        this.attachEventListeners(matches);
    }

    /**
     * Renderiza la tabla de histórico de partidos
     * @param {Array} matches - Array de partidos a mostrar
     */
    renderTable(matches) {
        const tableDiv = document.getElementById('historico-table');
        if (!matches.length) {
            tableDiv.innerHTML = '<p>No hay partidos que coincidan con la búsqueda.</p>';
            return;
        }

        let html = `
            <table class="tabla-historico">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Resultado</th>
                        <th>MVP</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>
        `;

        matches.forEach((match, idx) => {
            const fecha = formatDate(match.matchDate);
            const resultado = getResultado(match);
            html += `
                <tr>
                    <td data-label="Fecha">${fecha}</td>
                    <td data-label="Resultado">${resultado}</td>
                    <td data-label="MVP">${match.mvp && match.mvp.trim() !== '-' ? match.mvp : 'Sin MVP'}</td>
                    <td data-label="Detalle"><button class="detalle-btn" data-idx="${idx}">Ver detalle</button></td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableDiv.innerHTML = html;

        // Adjuntar event listeners a los botones de detalle
        document.querySelectorAll('.detalle-btn').forEach(btn => {
            btn.onclick = () => {
                const idx = btn.getAttribute('data-idx');
                this.mostrarDetalle(matches[idx]);
            };
        });
    }

    /**
     * Muestra el detalle de un partido
     * @param {Object} match - Datos del partido
     */
    mostrarDetalle(match) {
        const detalleDiv = document.getElementById('detalle-match');
        const data = this.dataManager.getCurrentData();
        const fijos = data ? data.fijos || [] : [];
        
        detalleDiv.innerHTML = renderDetallePartido(match, fijos);
    }

    /**
     * Adjunta los event listeners de la vista
     * @param {Array} matches - Array de todos los partidos
     */
    attachEventListeners(matches) {
        const filterDia = document.getElementById('filter-dia');
        const filterBtn = document.getElementById('filter-btn');

        // Event listener para cambio de día
        if (filterDia) {
            filterDia.addEventListener('change', () => {
                const diaSeleccionado = filterDia.value;
                if (diaSeleccionado !== 'todos') {
                    this.dataManager.setCurrentDay(diaSeleccionado);
                    this.render();
                }
            });
        }

        // Event listener para botón de búsqueda
        if (filterBtn) {
            filterBtn.onclick = () => {
                const fecha = document.getElementById('filter-fecha').value;
                const mvp = document.getElementById('filter-mvp').value.toLowerCase();
                const lineup = document.getElementById('filter-lineup').value.toLowerCase();

                const filtered = matches.filter(match => {
                    let ok = true;
                    if (fecha) {
                        ok = ok && match.matchDate.startsWith(fecha);
                    }
                    if (mvp) {
                        ok = ok && match.mvp && match.mvp.trim() !== '-' && match.mvp.toLowerCase().includes(mvp);
                    }
                    if (lineup) {
                        ok = ok && getAllMembers(match).some(m => m.name.toLowerCase().includes(lineup));
                    }
                    return ok;
                });

                this.renderTable(filtered);
                document.getElementById('detalle-match').innerHTML = '';
            };
        }
    }
}
