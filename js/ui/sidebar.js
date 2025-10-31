/**
 * SidebarManager - Gestiona el comportamiento del menú lateral
 */
export class SidebarManager {
    constructor() {
        this.sidebar = document.getElementById('sidebar');
        this.toggleBtn = document.getElementById('toggleBtn');
        this.backdrop = document.getElementById('mobile-backdrop');
        this.isMobile = window.innerWidth <= 768;
        
        this.init();
    }

    /**
     * Inicializa el sidebar y sus event listeners
     */
    init() {
        this.checkMobile();
        this.attachEventListeners();
        this.setupTouchGestures();
    }

    /**
     * Verifica si el dispositivo es móvil
     */
    checkMobile() {
        this.isMobile = window.innerWidth <= 768;
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
        } else {
            document.body.classList.remove('mobile-device');
        }
    }

    /**
     * Alterna la visibilidad del sidebar
     */
    toggle() {
        if (this.isMobile) {
            this.toggleMobile();
        } else {
            this.sidebar.classList.toggle('collapsed');
        }
    }

    /**
     * Alterna el sidebar en dispositivos móviles
     */
    toggleMobile() {
        const isOpen = this.sidebar.classList.contains('mobile-open');
        this.sidebar.classList.toggle('mobile-open');
        this.backdrop.classList.toggle('active');
        document.body.style.overflow = isOpen ? '' : 'hidden';
    }

    /**
     * Cierra el sidebar
     */
    close() {
        if (this.isMobile) {
            this.sidebar.classList.remove('mobile-open');
            this.backdrop.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    /**
     * Adjunta los event listeners necesarios
     */
    attachEventListeners() {
        this.toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggle();
        });

        this.backdrop.addEventListener('click', () => this.close());

        window.addEventListener('resize', () => {
            this.checkMobile();
            if (!this.isMobile) {
                this.sidebar.classList.remove('mobile-open');
                this.backdrop.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    /**
     * Configura gestos táctiles para dispositivos móviles
     */
    setupTouchGestures() {
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;

        document.addEventListener('touchstart', (e) => {
            if (!this.isMobile) return;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });

        document.addEventListener('touchend', (e) => {
            if (!this.isMobile) return;
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            this.handleSwipeGesture(touchStartX, touchStartY, touchEndX, touchEndY);
        });

        // Prevenir scroll cuando el sidebar está abierto en móvil
        document.addEventListener('touchmove', (e) => {
            if (this.isMobile && this.sidebar.classList.contains('mobile-open')) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    /**
     * Maneja los gestos de deslizamiento
     * @param {number} startX - Posición inicial X
     * @param {number} startY - Posición inicial Y
     * @param {number} endX - Posición final X
     * @param {number} endY - Posición final Y
     */
    handleSwipeGesture(startX, startY, endX, endY) {
        const swipeThreshold = 50;
        const swipeDistanceX = endX - startX;
        const swipeDistanceY = Math.abs(endY - startY);
        
        // Solo activar si el deslizamiento horizontal es mayor que el vertical
        if (Math.abs(swipeDistanceX) > swipeThreshold && swipeDistanceY < 100) {
            if (swipeDistanceX > 0 && startX < 50) {
                // Deslizar a la derecha desde el borde izquierdo - abrir sidebar
                this.sidebar.classList.add('mobile-open');
                this.backdrop.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else if (swipeDistanceX < 0 && this.sidebar.classList.contains('mobile-open')) {
                // Deslizar a la izquierda cuando el sidebar está abierto - cerrar sidebar
                this.close();
            }
        }
    }
}
