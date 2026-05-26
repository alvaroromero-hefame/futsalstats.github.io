/**
 * ClasificacionView - Vista de clasificación de jugadores
 */
import { calcularClasificacion } from '../utils/calculations.js';
import { renderDaySelector, renderLeyendaClasificacion } from '../utils/rendering.js';
import { PlayerStatsModal } from './playerStats.js';
import { SecurityUtils } from '../utils/security.js';

export class ClasificacionView {
    constructor(dataManager, container) {
        this.dataManager = dataManager;
        this.container = container;
        this.statsModal = new PlayerStatsModal(dataManager);
    }

    /**
     * Renderiza la vista de clasificación
     */
    render() {
        const data = this.dataManager.getCurrentData();
        if (!data) {
            this.container.innerHTML = '<p>Cargando datos...</p>';
            return;
        }

        const clasificacion = calcularClasificacion(data.matches, data.fijos);
        const currentDay = this.dataManager.getCurrentDay();
        
        let html = renderDaySelector(currentDay, '-class');
        html += '<h2>Clasificación Liga</h2>';
        html += this.renderTabla(clasificacion, data);
        html += renderLeyendaClasificacion();
        
        this.container.innerHTML = html;
        this.attachEventListeners();
    }

    /**
     * Renderiza la tabla de clasificación
     * @param {Array} clasificacion - Array de jugadores ordenados
     * @param {Object} data - Datos completos con fijos y próximo seleccionador
     * @returns {string} HTML de la tabla
     */
    renderTabla(clasificacion, data) {
        const fijos = data.fijos || [];
        
        let html = `
            <table class="tabla-historico tabla-clasificacion">
                <thead>
                    <tr>
                        <th>Posición</th>
                        <th>Jugador</th>
                        <th>Puntos</th>
                        <th>Pts/Partido</th>
                        <th>Goles</th>
                        <th>Asistencias</th>
                        <th>Encajados</th>
                        <th>Ganados</th>
                        <th>Empatados</th>
                        <th>Perdidos</th>
                        <th>MVPs</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        clasificacion.forEach((j, idx) => {
            let clase = '';
            let icono = '';
            let fijoIcon = '';
            let selectorIcon = '';
            
            // Sanitizar nombre del jugador
            const nombreSanitizado = SecurityUtils.sanitizeHTML(j.nombre);
            
            if (fijos.includes(j.nombre)) {
                fijoIcon = '⭐';
            }
            
            // Ícono del próximo seleccionador
            if (data.proximoSeleccionador && j.nombre === data.proximoSeleccionador) {
                selectorIcon = '⚽';
            }
            
            if (idx === 0) {
                clase = 'primero';
                icono = '🏆';
            }
            if (idx === clasificacion.length - 1) {
                clase = 'ultimo';
                icono = '😭';
            }
            
            // Sanitizar todos los valores numéricos
            const puntos = SecurityUtils.sanitizeNumber(j.puntos, 0).toFixed(2);
            const goles = SecurityUtils.sanitizeNumber(j.goles, 0);
            const asistencias = SecurityUtils.sanitizeNumber(j.asistencias || 0, 0);
            const encajados = SecurityUtils.sanitizeNumber(j.encajados, 0);
            const ganados = SecurityUtils.sanitizeNumber(j.ganados, 0);
            const empatados = SecurityUtils.sanitizeNumber(j.empatados, 0);
            const perdidos = SecurityUtils.sanitizeNumber(j.perdidos, 0);
            const mvps = SecurityUtils.sanitizeNumber(j.mvps || 0, 0);
            const partidos = ganados + empatados + perdidos;
            const puntosPerPartido = partidos > 0 ? (SecurityUtils.sanitizeNumber(j.puntos, 0) / partidos).toFixed(2) : '0.00';
            
            html += `
                <tr class="${clase}" data-player="${SecurityUtils.sanitizeAttribute(j.nombre)}" style="cursor: pointer;">
                    <td data-label="Posición">${idx + 1}</td>
                    <td data-label="Jugador">${nombreSanitizado} ${icono} ${fijoIcon} ${selectorIcon}</td>
                    <td data-label="Puntos">${puntos}</td>
                    <td data-label="Pts/Partido">${puntosPerPartido}</td>
                    <td data-label="Goles">${goles}</td>
                    <td data-label="Asistencias">${asistencias}</td>
                    <td data-label="Encajados">${encajados}</td>
                    <td data-label="Ganados">${ganados}</td>
                    <td data-label="Empatados">${empatados}</td>
                    <td data-label="Perdidos">${perdidos}</td>
                    <td data-label="MVPs">${mvps}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        return html;
    }

    /**
     * Adjunta los event listeners de la vista
     */
    attachEventListeners() {
        const btnMartes = document.getElementById('btn-martes-class');
        const btnJueves = document.getElementById('btn-jueves-class');
        
        if (btnMartes) {
            btnMartes.addEventListener('click', () => {
                this.dataManager.setCurrentDay('martes');
                this.render();
            });
        }
        
        if (btnJueves) {
            btnJueves.addEventListener('click', () => {
                this.dataManager.setCurrentDay('jueves');
                this.render();
            });
        }

        // Event listeners para clicks en jugadores
        const playerRows = this.container.querySelectorAll('tr[data-player]');
        playerRows.forEach(row => {
            row.addEventListener('click', () => {
                const playerName = row.getAttribute('data-player');
                this.statsModal.show(playerName);
            });
        });
    }
}
