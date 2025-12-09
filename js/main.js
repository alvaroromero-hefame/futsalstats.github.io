/**
 * Main - Punto de entrada principal de la aplicación Futsal Stats
 */
// Ya no necesitamos importar el SDK de Supabase - usamos REST directo
import { DataManager } from './dataManager.js';
import { SidebarManager } from './ui/sidebar.js';
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
        this.sidebarManager = null;
        this.mainContent = document.getElementById('main-content');
        this.views = {};
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
        this.sidebarManager = new SidebarManager();
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
        
        // Mostrar vista inicial
        this.showView('clasificacion');
        
        console.log('✅ FutsalStats iniciado correctamente');
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
                    console.warn('⚠️ Las tablas aún no existen. Ejecuta el script supabase-init.sql');
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
        badge.textContent = '🟢 Supabase';
        badge.classList.add('connected');
    }

    /**
     * Configura los event listeners de navegación
     */
    setupNavigation() {
        const menuItems = [
            { id: 'menu-clasificacion', view: 'clasificacion' },
            { id: 'menu-historico', view: 'historico' },
            { id: 'menu-estadisticas', view: 'estadisticas' },
            { id: 'menu-comparativa', view: 'comparativa' },
            { id: 'menu-simulador', view: 'simulador' },
            { id: 'menu-analisis-ia', view: 'analisisIA' }
        ];

        menuItems.forEach(({ id, view }) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showView(view);
                    this.sidebarManager?.close();
                });
            }
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
            
            // Remover clase active de todos los enlaces
            document.querySelectorAll('.menu a').forEach(a => a.classList.remove('active'));
            
            // Añadir clase active al enlace actual
            const activeLink = document.getElementById(`menu-${viewName}`);
            if (activeLink) {
                activeLink.classList.add('active');
            }
            
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
            badge.textContent = '🔴 Error';
            badge.classList.remove('connected');
            badge.classList.add('error');
        }
        
        this.mainContent.innerHTML = `
            <div style="padding: 20px; text-align: center;">
                <h2 style="color: #ef4444;">❌ Error</h2>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 20px;
                    padding: 10px 20px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 6px;
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
