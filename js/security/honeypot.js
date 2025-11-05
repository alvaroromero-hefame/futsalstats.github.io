/**
 * Honeypot - Sistema anti-bot para formularios
 * Detecta bots mediante campos ocultos que los humanos no ven
 */

export class Honeypot {
    constructor(options = {}) {
        this.fieldName = options.fieldName || 'website'; // Nombre engañoso para bots
        this.maxTime = options.maxTime || 2000; // Tiempo mínimo para llenar (ms)
        this.minTime = options.minTime || 500; // Tiempo mínimo realista
        this.startTimes = new Map(); // Tracking de tiempos por formulario
    }

    /**
     * Agrega campo honeypot a un formulario
     * 
     * @param {HTMLFormElement} form - Formulario al que agregar honeypot
     */
    addToForm(form) {
        if (!form || form.dataset.honeypotAdded === 'true') {
            return; // Ya tiene honeypot
        }

        // Crear campo honeypot (invisible para humanos)
        const honeypotField = document.createElement('input');
        honeypotField.type = 'text';
        honeypotField.name = this.fieldName;
        honeypotField.id = `honeypot-${this.fieldName}`;
        honeypotField.value = '';
        honeypotField.tabIndex = -1; // No accesible con Tab
        honeypotField.autocomplete = 'off';
        honeypotField.setAttribute('aria-hidden', 'true');
        
        // CSS para ocultarlo (múltiples técnicas)
        honeypotField.style.cssText = `
            position: absolute !important;
            left: -9999px !important;
            width: 1px !important;
            height: 1px !important;
            opacity: 0 !important;
            pointer-events: none !important;
        `;

        // Agregar label oculto (accesibilidad)
        const label = document.createElement('label');
        label.htmlFor = honeypotField.id;
        label.textContent = 'Leave this field empty';
        label.style.cssText = honeypotField.style.cssText;

        // Insertar al inicio del form
        form.insertBefore(label, form.firstChild);
        form.insertBefore(honeypotField, form.firstChild);

        // Marcar como procesado
        form.dataset.honeypotAdded = 'true';

        // Registrar tiempo de inicio
        this.startTimes.set(form, Date.now());

        console.log('🍯 [HONEYPOT] Campo agregado al formulario');
    }

    /**
     * Valida que el formulario no fue llenado por un bot
     * 
     * @param {HTMLFormElement} form - Formulario a validar
     * @returns {Object} { isBot: boolean, reason: string }
     */
    validate(form) {
        const formData = new FormData(form);
        const honeypotValue = formData.get(this.fieldName);

        // Test 1: Campo honeypot llenado (BOT)
        if (honeypotValue && honeypotValue.trim() !== '') {
            console.warn('🚨 [HONEYPOT] Bot detectado: campo honeypot llenado');
            return {
                isBot: true,
                reason: 'honeypot_filled',
                details: 'Honeypot field was filled'
            };
        }

        // Test 2: Tiempo de llenado (demasiado rápido = BOT)
        const startTime = this.startTimes.get(form);
        if (startTime) {
            const elapsed = Date.now() - startTime;
            
            if (elapsed < this.minTime) {
                console.warn(`🚨 [HONEYPOT] Bot detectado: formulario llenado muy rápido (${elapsed}ms)`);
                return {
                    isBot: true,
                    reason: 'too_fast',
                    details: `Form filled in ${elapsed}ms (min: ${this.minTime}ms)`
                };
            }

            // Limpiar después de validar
            this.startTimes.delete(form);
        }

        // Test 3: JavaScript deshabilitado (opcional, menos estricto)
        // Los bots simples no ejecutan JS, pero esto puede dar falsos positivos

        console.log('✅ [HONEYPOT] Validación exitosa - Usuario humano');
        return {
            isBot: false,
            reason: null
        };
    }

    /**
     * Protege todos los formularios de una página
     * 
     * @param {string} selector - Selector CSS para formularios (default: 'form')
     */
    protectForms(selector = 'form') {
        const forms = document.querySelectorAll(selector);
        
        forms.forEach(form => {
            this.addToForm(form);
            
            // Agregar validación en submit
            form.addEventListener('submit', (e) => {
                const validation = this.validate(form);
                
                if (validation.isBot) {
                    e.preventDefault();
                    console.error('🚨 Bot detectado:', validation.reason);
                    
                    // Mostrar mensaje genérico (no revelar que es honeypot)
                    alert('Por favor, completa el formulario correctamente.');
                    
                    // Opcional: enviar evento de seguridad
                    this.reportBotAttempt(validation);
                    
                    return false;
                }
            });
        });

        console.log(`🍯 [HONEYPOT] ${forms.length} formularios protegidos`);
    }

    /**
     * Reporta intento de bot (opcional - enviar a analytics o logs)
     * 
     * @param {Object} validation - Resultado de validación
     */
    reportBotAttempt(validation) {
        // Enviar a sistema de logs o analytics
        console.warn('🤖 Bot attempt detected:', {
            reason: validation.reason,
            details: validation.details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });

        // Si tienes AuditLogger, puedes usarlo:
        if (window.auditLogger) {
            window.auditLogger.logSecurityEvent('BOT_DETECTED', {
                reason: validation.reason,
                details: validation.details
            });
        }
    }

    /**
     * Crear honeypot customizado con configuración específica
     * 
     * @param {Object} config - Configuración del honeypot
     * @returns {Object} Campo honeypot y validador
     */
    static createCustom(config = {}) {
        return {
            field: {
                name: config.fieldName || 'email_confirm',
                type: config.fieldType || 'text',
                label: config.label || 'Please leave this field empty',
                style: config.hideStyle || 'display:none'
            },
            validator: (value) => {
                if (config.allowEmpty === false) {
                    return value === config.expectedValue;
                }
                return !value || value.trim() === '';
            }
        };
    }
}

/**
 * Instancia global de Honeypot
 */
export const globalHoneypot = new Honeypot({
    fieldName: 'website',
    minTime: 800,
    maxTime: 2000
});

/**
 * Helper function para proteger un formulario específico
 * 
 * @param {string|HTMLFormElement} formSelector - Selector o elemento del form
 */
export function protectForm(formSelector) {
    const form = typeof formSelector === 'string' 
        ? document.querySelector(formSelector) 
        : formSelector;
    
    if (form) {
        globalHoneypot.addToForm(form);
    }
}

/**
 * Helper function para validar antes de submit
 * 
 * @param {HTMLFormElement} form - Formulario a validar
 * @returns {boolean} true si es humano, false si es bot
 */
export function validateHoneypot(form) {
    const result = globalHoneypot.validate(form);
    return !result.isBot;
}
