/**
 * Security Module - Punto central de entrada para todas las utilidades de seguridad
 * Facilita la importación de módulos de seguridad en la aplicación
 */

// Fase 1: Sanitización y validación
export { 
    sanitizeHTML, 
    sanitizeText, 
    sanitizeURL, 
    sanitizeAttribute 
} from '../utils/security.js';

export { 
    validatePlayer, 
    validateMatch, 
    validateMatchDate, 
    validateScore, 
    validateEmail, 
    validatePassword 
} from '../utils/validation.js';

// Fase 1: Autenticación
export { AuthManager } from '../auth/authManager.js';
export { AuthGuard } from '../auth/authGuard.js';

// Fase 2: Rate Limiting
export { 
    RateLimiter, 
    globalRateLimiter, 
    loginRateLimiter, 
    adminRateLimiter 
} from './rateLimiter.js';

// Fase 2: CSRF Protection
export { 
    CSRFProtection, 
    globalCSRF, 
    withCSRF 
} from './csrfProtection.js';

// Fase 2: Audit Logging
export { AuditLogger } from '../utils/logger.js';

// Fase 3: Protecciones Avanzadas
export { 
    Honeypot, 
    globalHoneypot, 
    protectForm, 
    validateHoneypot 
} from './honeypot.js';

export { 
    IPWhitelist, 
    globalIPWhitelist, 
    protectWithIP 
} from './ipWhitelist.js';

export { 
    SessionTimeout, 
    globalSessionTimeout, 
    startSessionTimeout 
} from './sessionTimeout.js';

/**
 * Configuración de seguridad por defecto
 */
export const securityConfig = {
    rateLimit: {
        global: {
            maxRequests: 100,
            windowMs: 60000 // 1 minuto
        },
        login: {
            maxRequests: 5,
            windowMs: 60000 // 1 minuto
        },
        admin: {
            maxRequests: 30,
            windowMs: 60000 // 1 minuto
        }
    },
    csrf: {
        tokenLength: 32,
        headerName: 'X-CSRF-Token',
        inputName: 'csrf_token'
    },
    audit: {
        enabled: true,
        consoleLogging: true,
        retentionDays: 90
    },
    honeypot: {
        enabled: true,
        fieldName: 'website',
        minTime: 800
    },
    ipWhitelist: {
        enabled: false, // Cambiar a true para habilitar
        strictMode: false,
        bypassOnLocalhost: true
    },
    sessionTimeout: {
        enabled: true,
        timeout: 15 * 60 * 1000,      // 15 minutos
        warningTime: 2 * 60 * 1000     // Warning 2 min antes
    }
};

/**
 * Inicializar todos los módulos de seguridad
 */
export function initializeSecurity(supabaseClient, options = {}) {
    console.log('🔐 Inicializando módulos de seguridad...');
    
    // Crear instancias
    const authManager = new AuthManager(supabaseClient);
    const auditLogger = new AuditLogger(supabaseClient);
    
    // Fase 3: Inicializar protecciones avanzadas
    if (options.enableHoneypot !== false) {
        globalHoneypot.protectForms('form');
        console.log('  - ✅ Honeypot activado en formularios');
    }
    
    if (options.enableSessionTimeout !== false) {
        globalSessionTimeout.start();
        console.log('  - ✅ Session Timeout activado (15 min)');
    }
    
    if (options.enableIPWhitelist && globalIPWhitelist.enabled) {
        console.log('  - ✅ IP Whitelist activado');
    }
    
    console.log('✅ Módulos de seguridad inicializados:');
    console.log('  - ✅ XSS Sanitization');
    console.log('  - ✅ Input Validation');
    console.log('  - ✅ Rate Limiting');
    console.log('  - ✅ CSRF Protection');
    console.log('  - ✅ Audit Logging');
    console.log('  - ✅ Authentication (Supabase)');
    console.log('  - ✅ Honeypot (Anti-bot)');
    console.log('  - ✅ Session Timeout');
    
    return {
        authManager,
        auditLogger,
        rateLimiter: globalRateLimiter,
        csrf: globalCSRF,
        honeypot: globalHoneypot,
        sessionTimeout: globalSessionTimeout,
        ipWhitelist: globalIPWhitelist
    };
}
