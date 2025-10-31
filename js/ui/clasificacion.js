/**
 * ClasificacionView - Vista de clasificación de jugadores
 */
import { calcularClasificacion } from '../utils/calculations.js';
import { renderDaySelector, renderLeyendaClasificacion } from '../utils/rendering.js';
import { PlayerStatsModal } from './playerStats.js';

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
            
            html += `
                <tr class="${clase}" data-player="${j.nombre}" style="cursor: pointer;">
                    <td data-label="Posición">${idx + 1}</td>
                    <td data-label="Jugador">${j.nombre} ${icono} ${fijoIcon} ${selectorIcon}</td>
                    <td data-label="Puntos">${j.puntos.toFixed(2)}</td>
                    <td data-label="Goles">${j.goles}</td>
                    <td data-label="Asistencias">${j.asistencias || 0}</td>
                    <td data-label="Encajados">${j.encajados}</td>
                    <td data-label="Ganados">${j.ganados}</td>
                    <td data-label="Empatados">${j.empatados}</td>
                    <td data-label="Perdidos">${j.perdidos}</td>
                    <td data-label="MVPs">${j.mvps || 0}</td>
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
