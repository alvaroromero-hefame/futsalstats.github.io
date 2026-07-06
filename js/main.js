/**
 * Main - Punto de entrada principal de la aplicación Futsal Stats
 */
// Ya no necesitamos importar el SDK de Supabase - usamos REST directo
import { DataManager } from './dataManager.js';
import { ClasificacionView } from './ui/clasificacion.js';
import { HistoricoView } from './ui/historico.js';
import { EstadisticasView } from './ui/estadisticas.js';
import { ComparativaView } from './ui/comparativa.js';
import { SimuladorView } from './ui/simulador.js';
import { AnalisisIAView } from './ui/analisisIA.js';
import { initAdvancedStats } from './utils/advancedStats.js';
import { config } from './config.js';

/**
 * Clase principal de la aplicación
 */
class FutsalApp {
    constructor() {
        this.supabase = null;
        this.dataManager = null;
        this.mainContent = document.getElementById('main-content');
        this.views = {};
        this.currentView = null;
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        console.log('🚀 Iniciando FutsalStats...');
        console.log('📍 Entorno:', window.location.hostname);
        console.log('📍 URL completa:', window.location.href);
        console.log('📦 Configuración Supabase URL:', config.supabase.url);
        console.log('📦 Configuración Supabase Key (primeros 20 chars):', config.supabase.anonKey?.substring(0, 20) + '...');

        // Intentar inicializar Supabase
        console.log('⏳ Intentando conectar a Supabase...');
        const supabaseConnected = await this.initSupabase();
        console.log('✓ initSupabase completado. Conectado:', supabaseConnected);
        
        // Inicializar DataManager con o sin Supabase
        this.dataManager = new DataManager(this.supabase);
        
        // Cargar datos (intentará Supabase primero, luego JSON)
        console.log('⏳ Cargando datos...');
        const dataLoaded = await this.dataManager.loadData();
        console.log('✓ loadData completado. Datos cargados:', dataLoaded);

        // Restaurar temporada elegida por el usuario en una sesión anterior
        await this.restoreSeasonSelection();
        
        // Ocultar loading inicial
        console.log('⏳ Ocultando pantalla de carga...');
        const loadingEl = document.getElementById('initial-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        
        if (!dataLoaded) {
            this.showError('No se pudieron cargar los datos. Verifica tu conexión.');
            return;
        }

        // Mostrar fuente de datos en la UI (ahora en el footer)
        this.showDataSourceInfo();
        
        // Inicializar módulo de estadísticas avanzadas
        initAdvancedStats(this.dataManager);
        
        // Inicializar componentes UI
        this.setupChartTheme();
        this.views = {
            clasificacion: new ClasificacionView(this.dataManager, this.mainContent),
            historico: new HistoricoView(this.dataManager, this.mainContent),
            estadisticas: new EstadisticasView(this.dataManager, this.mainContent),
            comparativa: new ComparativaView(this.dataManager, this.mainContent),
            simulador: new SimuladorView(this.dataManager, this.mainContent),
            analisisIA: new AnalisisIAView(this.dataManager, this.mainContent)
        };
        
        // Configurar navegación
        this.setupNavigation();

        // Configurar selector global de temporada
        this.setupSeasonSelector();

        // Mostrar vista inicial
        this.showView('clasificacion');

        console.log('✅ FutsalStats iniciado correctamente');
    }

    /**
     * Restaura la temporada elegida por el usuario (persistida en localStorage) para cada día
     */
    async restoreSeasonSelection() {
        for (const day of ['martes', 'jueves']) {
            const saved = localStorage.getItem(`season_${day}`);
            if (!saved || saved === this.dataManager.currentSeason[day]) continue;
            const seasons = this.dataManager.getSeasons(day);
            if (seasons.some(s => s.id === saved)) {
                await this.dataManager.setCurrentSeason(day, saved);
            }
        }
    }

    /**
     * Configura el selector global de temporada del sidebar
     */
    setupSeasonSelector() {
        const select = document.getElementById('season-selector');
        if (!select) return;

        // Cuando una vista cambia de día, refrescar las opciones de temporada disponibles
        const setCurrentDay = this.dataManager.setCurrentDay.bind(this.dataManager);
        this.dataManager.setCurrentDay = (day) => {
            setCurrentDay(day);
            this.populateSeasonSelector();
        };

        select.addEventListener('change', async (e) => {
            const day = this.dataManager.getCurrentDay();
            const seasonId = e.target.value || null;
            localStorage.setItem(`season_${day}`, seasonId || '');
            await this.dataManager.setCurrentSeason(day, seasonId);
            this.rerenderActiveView();
        });

        this.populateSeasonSelector();
    }

    /**
     * Rellena el selector de temporada con las temporadas del día actual
     */
    populateSeasonSelector() {
        const select = document.getElementById('season-selector');
        if (!select) return;

        const day = this.dataManager.getCurrentDay();
        const seasons = this.dataManager.getSeasons(day);
        const current = this.dataManager.getCurrentSeason(day);

        select.innerHTML = seasons.map(s =>
            `<option value="${s.id}" ${current && s.id === current.id ? 'selected' : ''}>${s.is_active ? '★ ' : ''}${s.name}</option>`
        ).join('');
    }

    /**
     * Vuelve a renderizar la vista actualmente activa (tras cambiar de temporada)
     */
    rerenderActiveView() {
        if (!this.currentView) return;
        this.views[this.currentView]?.render();
    }

    /**
     * Ajusta los colores por defecto de Chart.js al tema (claro/oscuro)
     */
    setupChartTheme() {
        if (!window.Chart) return;
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        Chart.defaults.color = dark ? '#96a3c0' : '#5a6472';
        Chart.defaults.borderColor = dark ? 'rgba(150, 163, 192, 0.2)' : 'rgba(90, 100, 114, 0.2)';
        Chart.defaults.font.family = '"Barlow", system-ui, sans-serif';
    }

    /**
     * Inicializa la conexión a Supabase
     * @returns {Promise<boolean>} true si la conexión es exitosa
     */
    async initSupabase() {
        try {
            console.log('🔍 Iniciando initSupabase...');
            
            // Validar configuración
            if (!config.supabase.url || !config.supabase.anonKey) {
                console.warn('⚠️ Supabase no configurado. Usando datos locales (JSON)');
                console.warn('⚠️ URL:', config.supabase.url);
                console.warn('⚠️ Key:', config.supabase.anonKey ? 'existe' : 'no existe');
                return false;
            }

            console.log('⏳ Creando cliente REST para Supabase...');
            
            // Crear un cliente REST simple sin dependencias del SDK
            this.supabase = {
                from: (table) => {
                    return {
                        select: (columns = '*', options = {}) => {
                            let query = {
                                table,
                                columns,
                                filters: [],
                                order: null,
                                limit: null,
                                single: false,
                                maybeSingle: false
                            };
                            
                            const builder = {
                                eq: (column, value) => {
                                    query.filters.push({ column, operator: 'eq', value });
                                    return builder;
                                },
                                order: (column, opts = {}) => {
                                    query.order = { column, ascending: opts.ascending !== false };
                                    return builder;
                                },
                                limit: (count) => {
                                    query.limit = count;
                                    return builder;
                                },
                                single: () => {
                                    query.single = true;
                                    return builder;
                                },
                                maybeSingle: () => {
                                    query.maybeSingle = true;
                                    return builder;
                                },
                                then: async (resolve, reject) => {
                                    try {
                                        // Construir URL
                                        let url = `${config.supabase.url}/rest/v1/${table}`;
                                        let params = new URLSearchParams();
                                        
                                        if (columns !== '*') {
                                            params.append('select', columns);
                                        }
                                        
                                        // Agregar filtros
                                        query.filters.forEach(f => {
                                            params.append(f.column, `${f.operator}.${f.value}`);
                                        });
                                        
                                        // Agregar orden
                                        if (query.order) {
                                            params.append('order', `${query.order.column}.${query.order.ascending ? 'asc' : 'desc'}`);
                                        }
                                        
                                        // Agregar límite
                                        if (query.limit) {
                                            params.append('limit', query.limit);
                                        }
                                        
                                        if (params.toString()) {
                                            url += '?' + params.toString();
                                        }
                                        
                                        // Hacer request
                                        const headers = {
                                            'apikey': config.supabase.anonKey,
                                            'Authorization': `Bearer ${config.supabase.anonKey}`,
                                            'Content-Type': 'application/json',
                                            'Prefer': query.single ? 'return=representation,count=exact' : 'return=representation'
                                        };
                                        
                                        if (options.count) {
                                            headers['Prefer'] += ',count=exact';
                                        }
                                        
                                        if (options.head) {
                                            headers['Prefer'] = 'count=exact';
                                        }
                                        
                                        const response = await fetch(url, {
                                            method: options.head ? 'HEAD' : 'GET',
                                            headers
                                        });
                                        
                                        if (!response.ok) {
                                            const errorText = await response.text();
                                            const error = {
                                                message: errorText || response.statusText,
                                                code: response.status.toString(),
                                                details: errorText
                                            };
                                            resolve({ data: null, error });
                                            return;
                                        }
                                        
                                        let data = null;
                                        if (!options.head) {
                                            data = await response.json();
                                            
                                            if (query.single || query.maybeSingle) {
                                                if (Array.isArray(data)) {
                                                    data = data.length > 0 ? data[0] : null;
                                                }
                                            }
                                        }
                                        
                                        resolve({ data, error: null });
                                    } catch (error) {
                                        reject(error);
                                    }
                                }
                            };
                            
                            return builder;
                        }
                    };
                }
            };
            
            console.log('✓ Cliente REST creado');
            
            // Verificar conexión haciendo una query simple
            console.log('⏳ Verificando conexión con query de prueba...');
            const { data, error } = await this.supabase
                .from('matches')
                .select('id', { count: 'exact', head: true })
                .limit(1);

            console.log('✓ Query completada. Error:', error ? error.message : 'ninguno');
            console.log('✓ Data:', data);

            if (error) {
                // Si el error es "tabla no encontrada", la conexión funciona pero faltan tablas
                if (error.message.includes('does not exist') || 
                    error.message.includes('Could not find') ||
                    error.code === 'PGRST116' ||
                    error.code === '404') {
                    console.log('✅ Conexión a Supabase establecida correctamente');
                    console.warn('⚠️ Las tablas aún no existen. Ejecuta el script sql/supabase-init.sql');
                    console.warn('📝 Ve a: SQL Editor > New Query > Pega el contenido > Run');
                    return true; // Conexión OK, solo faltan tablas
                }
                
                throw error;
            }

            console.log('✅ Conexión a Supabase establecida y verificada');
            console.log('✅ Base de datos configurada correctamente');
            return true;

        } catch (error) {
            console.error('❌ Error conectando a Supabase:', error.message);
            console.error('❌ Error completo:', error);
            console.error('❌ Stack:', error.stack);
            console.error('❌ Tipo de error:', error.name);
            console.log('📝 Continuando con datos locales (JSON)');
            this.supabase = null;
            return false;
        }
    }

    /**
     * Muestra información sobre la fuente de datos en uso
     */
    showDataSourceInfo() {
        const badge = document.getElementById('data-source-badge');
        if (!badge) return;

        // Solo Supabase disponible ahora
        badge.textContent = '● Supabase';
        badge.classList.add('connected');
    }

    /**
     * Configura los event listeners de navegación
     */
    setupNavigation() {
        // Sidebar (escritorio) y tab bar (móvil) comparten data-view
        document.querySelectorAll('[data-view]').forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView(element.dataset.view);
            });
        });
    }

    /**
     * Muestra una vista específica
     * @param {string} viewName - Nombre de la vista a mostrar
     */
    showView(viewName) {
        if (this.views[viewName]) {
            // Limpiar vista anterior si tiene método cleanup
            Object.values(this.views).forEach(view => {
                if (view.cleanup && typeof view.cleanup === 'function') {
                    view.cleanup();
                }
            });
            
            // Marcar enlace activo en sidebar y tab bar
            document.querySelectorAll('[data-view]').forEach(a => {
                a.classList.toggle('active', a.dataset.view === viewName);
            });
            this.currentView = viewName;


            // Renderizar vista
            this.views[viewName].render();
            
            // Configurar instancia global para simulador
            if (viewName === 'simulador') {
                window.simuladorView = this.views[viewName];
            }
        } else {
            console.error('❌ Vista no encontrada:', viewName);
        }
    }

    /**
     * Muestra un mensaje de error en la interfaz
     * @param {string} message - Mensaje de error a mostrar
     */
    showError(message) {
        // Actualizar badge de conexión
        const badge = document.getElementById('data-source-badge');
        if (badge) {
            badge.textContent = '● Error';
            badge.classList.remove('connected');
            badge.classList.add('error');
        }

        this.mainContent.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2 style="color: var(--loss);">Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: var(--primary);
                    color: var(--on-primary);
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                ">
                    Reintentar
                </button>
            </div>
        `;
    }
}

// Iniciar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    const app = new FutsalApp();
    app.init();
});
