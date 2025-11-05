/**
 * EstadisticasView - Vista de estadísticas de la temporada
 */
import { 
    calcularTotalGoles, 
    calcularVictorias, 
    calcularTopGoleadores,
    calcularTopEncajados,
    calcularTopAsistencias,
    calcularContadorNoFijos
} from '../utils/calculations.js';
import { renderDaySelector, renderList, renderGraficoVictorias } from '../utils/rendering.js';
import { SecurityUtils } from '../utils/security.js';

export class EstadisticasView {
    constructor(dataManager, container) {
        this.dataManager = dataManager;
        this.container = container;
    }

    /**
     * Renderiza la vista de estadísticas
     */
    render() {
        const data = this.dataManager.getCurrentData();
        const currentDay = this.dataManager.getCurrentDay();
        
        if (!data) {
            this.container.innerHTML = '<p>Cargando datos...</p>';
            return;
        }

        // Crear el HTML de la vista
        let html = `
            <div class="estadisticas-container">
                <h1>Estadísticas de la Temporada</h1>
                ${renderDaySelector(currentDay, '-stats')}
        `;

        // Añadir contador de no fijos solo para jueves
        if (currentDay === 'jueves') {
            html += `
                <div class="fila" style="justify-content: center;">
                    <div class="columna izquierda" style="max-width: 400px;">
                        <h2>💰 Recaudación</h2>
                        <p id="contador-no-fijos" class="estadistica-grande" style="color: #f39c12;">Cargando...</p>
                    </div>
                </div>
            `;
        }

        html += `
                <div class="fila">
                    <div class="columna izquierda">
                        <h2>Número de Goles Totales</h2>
                        <p id="total-goles" class="estadistica-grande">Cargando...</p>
                    </div>
                    <div class="columna derecha izquierda">
                        <h2>Victorias</h2>
                        <div id="victorias-display">Cargando...</div>
                    </div>
                </div>
                <div class="fila">
                    <div class="columna izquierda">
                        <h2>Top 3 Goleadores</h2>
                        <ul id="top-goleadores">Cargando...</ul>
                    </div>
                    <div class="columna derecha izquierda">
                        <h2>Top 3 Encajados</h2>
                        <ul id="top-encajados">Cargando...</ul>
                    </div>
                </div>
                <div class="fila">
                    <div class="columna izquierda">
                        <h2>Top 3 Asistencias</h2>
                        <ul id="top-asistencias">Cargando...</ul>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
        this.loadStats(data);
        this.attachEventListeners();
    }

    /**
     * Carga y renderiza las estadísticas
     * @param {Object} data - Datos del día actual
     */
    loadStats(data) {
        // Calcular estadísticas
        const totalGoles = calcularTotalGoles(data);
        const victorias = calcularVictorias(data);
        const topGoleadores = calcularTopGoleadores(data);
        const topEncajados = calcularTopEncajados(data);
        const topAsistencias = calcularTopAsistencias(data);

        // Renderizar estadísticas
        const totalGolesEl = document.getElementById('total-goles');
        if (totalGolesEl) {
            totalGolesEl.textContent = totalGoles;
        }

        const victoriasDisplay = document.getElementById('victorias-display');
        if (victoriasDisplay) {
            victoriasDisplay.innerHTML = renderGraficoVictorias(victorias);
        }

        const topGoleadoresEl = document.getElementById('top-goleadores');
        if (topGoleadoresEl) {
            topGoleadoresEl.innerHTML = renderList(topGoleadores);
        }

        const topEncajadosEl = document.getElementById('top-encajados');
        if (topEncajadosEl) {
            topEncajadosEl.innerHTML = renderList(topEncajados);
        }

        const topAsistenciasEl = document.getElementById('top-asistencias');
        if (topAsistenciasEl) {
            topAsistenciasEl.innerHTML = renderList(topAsistencias);
        }

        // Contador de no fijos solo para jueves
        const currentDay = this.dataManager.getCurrentDay();
        if (currentDay === 'jueves') {
            const contadorNoFijos = calcularContadorNoFijos(data);
            const contadorElement = document.getElementById('contador-no-fijos');
            if (contadorElement) {
                contadorElement.textContent = contadorNoFijos + '€';
            }
        }
    }

    /**
     * Adjunta los event listeners de la vista
     */
    attachEventListeners() {
        const btnMartes = document.getElementById('btn-martes-stats');
        const btnJueves = document.getElementById('btn-jueves-stats');

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
    }
}
