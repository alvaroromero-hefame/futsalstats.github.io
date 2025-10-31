# Arquitectura del Proyecto Futsal Stats

## 🏗️ Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.html                              │
│                    (Punto de entrada HTML)                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │                                       │
        ↓                                       ↓
┌───────────────┐                      ┌────────────────┐
│   CSS Files   │                      │   JavaScript   │
└───────────────┘                      └────────────────┘
        │                                       │
        ├─ main.css                            ↓
        ├─ sidebar.css              ┌──────────────────┐
        ├─ tables.css               │    main.js       │
        └─ mobile.css               │  (Orquestador)   │
                                    └──────────────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    ↓                        ↓                        ↓
        ┌─────────────────────┐  ┌─────────────────┐  ┌──────────────────┐
        │   dataManager.js    │  │  SidebarManager │  │   Views (UI)     │
        │  (Gestión Datos)    │  │  (Menú Lateral) │  │                  │
        └─────────────────────┘  └─────────────────┘  └──────────────────┘
                    │                                           │
                    │                     ┌─────────────────────┼─────────────┐
                    │                     ↓                     ↓             ↓
                    │          ┌──────────────────┐  ┌─────────────┐  ┌──────────────┐
                    │          │ clasificacion.js │  │historico.js │  │estadisticas.js│
                    │          └──────────────────┘  └─────────────┘  └──────────────┘
                    │                     │                     │             │
                    │                     └─────────────────────┴─────────────┘
                    │                                           │
                    │                     ┌─────────────────────┘
                    │                     ↓
                    │          ┌─────────────────────────┐
                    │          │    Utils (Utilidades)   │
                    │          └─────────────────────────┘
                    │                     │
                    │          ┌──────────┴──────────┐
                    │          ↓                     ↓
                    │  ┌──────────────┐    ┌─────────────────┐
                    │  │calculations.js│    │  rendering.js   │
                    │  └──────────────┘    └─────────────────┘
                    │
                    ↓
        ┌─────────────────────┐
        │    data/ (JSON)     │
        ├─────────────────────┤
        │ FutsalStatsMartes   │
        │ FutsalStatsJueves   │
        └─────────────────────┘
```

## 📦 Flujo de Datos

```
1. Usuario carga index.html
         ↓
2. main.js se ejecuta
         ↓
3. DataManager carga JSONs desde data/
         ↓
4. SidebarManager inicializa menú
         ↓
5. Vistas se registran (clasificacion, historico, estadisticas)
         ↓
6. Se muestra vista inicial (clasificación)
         ↓
7. Usuario interactúa (clicks, filtros)
         ↓
8. Vista correspondiente se renderiza
         ↓
9. Utils proporcionan cálculos y renderizado
         ↓
10. Resultado se muestra en main-content
```

## 🔄 Interacción entre Componentes

### Cuando el usuario navega a "Clasificación":

```
Usuario click → menu-clasificacion
                      ↓
                  main.js detecta click
                      ↓
                showView('clasificacion')
                      ↓
          clasificacion.js → render()
                      ↓
          dataManager → getCurrentData()
                      ↓
          calculations.js → calcularClasificacion()
                      ↓
          rendering.js → renderDaySelector(), renderLeyendaClasificacion()
                      ↓
          HTML generado se inserta en main-content
                      ↓
          Event listeners adjuntados
                      ↓
          Vista mostrada al usuario
```

### Cuando el usuario cambia de día (Martes/Jueves):

```
Usuario click → btn-martes / btn-jueves
                      ↓
          Vista detecta click
                      ↓
          dataManager.setCurrentDay('martes'/'jueves')
                      ↓
          Vista se re-renderiza con nuevos datos
                      ↓
          Cálculos se ejecutan con datos del nuevo día
                      ↓
          Nueva tabla/estadísticas se muestran
```

## 🎨 Separación de Responsabilidades

### Capa de Datos (Data Layer)
```
dataManager.js
    │
    ├─ loadData()          → Carga archivos JSON
    ├─ getCurrentData()    → Retorna datos del día actual
    ├─ setCurrentDay()     → Cambia el día activo
    └─ isDataLoaded()      → Verifica si datos están listos
```

### Capa de Lógica (Business Logic Layer)
```
calculations.js
    │
    ├─ calcularClasificacion()     → Ranking de jugadores
    ├─ calcularTotalGoles()        → Suma total de goles
    ├─ calcularVictorias()         → Cuenta victorias por equipo
    ├─ calcularTopGoleadores()     → Top 3 goleadores
    ├─ calcularTopEncajados()      → Top 3 con más goles encajados
    ├─ calcularTopAsistencias()    → Top 3 asistencias
    ├─ calcularContadorNoFijos()   → Cuenta participaciones no fijos
    ├─ getResultado()              → Formatea resultado del partido
    └─ getAllMembers()             → Obtiene todos los jugadores de un partido
```

### Capa de Presentación (Presentation Layer)
```
rendering.js
    │
    ├─ renderDaySelector()          → Genera selector Martes/Jueves
    ├─ formatDate()                 → Formatea fechas
    ├─ renderDetallePartido()       → Genera HTML de lineup
    ├─ renderList()                 → Genera listas HTML
    ├─ renderGraficoVictorias()     → Genera visualización de victorias
    └─ renderLeyendaClasificacion() → Genera leyenda de puntuación
```

### Capa de Vista (View Layer)
```
ui/
 ├─ sidebar.js          → Gestiona comportamiento del menú
 ├─ clasificacion.js    → Vista de clasificación
 ├─ historico.js        → Vista de histórico
 └─ estadisticas.js     → Vista de estadísticas
```

## 🔌 Dependencias entre Módulos

```
main.js
  ├── imports: dataManager.js
  ├── imports: ui/sidebar.js
  ├── imports: ui/clasificacion.js
  ├── imports: ui/historico.js
  └── imports: ui/estadisticas.js

ui/clasificacion.js
  ├── imports: utils/calculations.js (calcularClasificacion)
  └── imports: utils/rendering.js (renderDaySelector, renderLeyendaClasificacion)

ui/historico.js
  ├── imports: utils/calculations.js (getResultado, getAllMembers)
  └── imports: utils/rendering.js (formatDate, renderDetallePartido)

ui/estadisticas.js
  ├── imports: utils/calculations.js (todas las funciones de cálculo)
  └── imports: utils/rendering.js (renderDaySelector, renderList, renderGraficoVictorias)

ui/sidebar.js
  └── (sin dependencias externas, solo DOM)

dataManager.js
  └── (sin dependencias externas, solo Fetch API)

utils/calculations.js
  └── (sin dependencias, funciones puras)

utils/rendering.js
  └── (sin dependencias, funciones puras)
```

## 🎯 Patrones de Diseño Utilizados

### 1. **Module Pattern**
Cada archivo es un módulo ES6 con exports/imports claros.

### 2. **Class-Based Components**
Las vistas y managers son clases con métodos definidos.

### 3. **Separation of Concerns**
- Datos separados de la lógica
- Lógica separada de la presentación
- Presentación separada de la vista

### 4. **Single Responsibility Principle**
Cada módulo tiene una única responsabilidad bien definida.

### 5. **Dependency Injection**
Las vistas reciben `dataManager` y `container` como dependencias.

### 6. **Observer Pattern** (implícito)
Las vistas observan cambios en el día seleccionado y se re-renderizan.

## 📊 Métricas de Complejidad

### Antes de la refactorización:
- **Archivos**: 3 (index.html, FutsalStats.js, FutsalStats.css)
- **Líneas en JS**: ~800 en un solo archivo
- **Acoplamiento**: Alto (todo mezclado)
- **Cohesión**: Baja (múltiples responsabilidades)
- **Testabilidad**: Difícil

### Después de la refactorización:
- **Archivos**: 14 (bien organizados)
- **Líneas promedio por archivo JS**: ~150
- **Acoplamiento**: Bajo (dependencias explícitas)
- **Cohesión**: Alta (una responsabilidad por módulo)
- **Testabilidad**: Fácil (funciones puras separadas)

## 🚀 Ventajas de esta Arquitectura

1. **Modularidad**: Cambios localizados en módulos específicos
2. **Reusabilidad**: Funciones de cálculo y renderizado reutilizables
3. **Mantenibilidad**: Código más fácil de leer y mantener
4. **Escalabilidad**: Fácil añadir nuevas vistas o funcionalidades
5. **Testabilidad**: Funciones puras fáciles de testear
6. **Colaboración**: Múltiples desarrolladores pueden trabajar en paralelo
7. **Debugging**: Más fácil encontrar y corregir errores
8. **Performance**: Posibilidad de lazy loading de módulos en el futuro
