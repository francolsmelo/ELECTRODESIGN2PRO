# ElectroDesign Pro - Sistema de Ingeniería Eléctrica

## Descripción
Aplicación web profesional para diseño, análisis y presupuestación de proyectos de distribución eléctrica en media y baja tensión bajo normativa ecuatoriana (CNEL, EEASA).

## Características Implementadas

### ✅ Módulo de Autenticación
- Registro e inicio de sesión con JWT
- Gestión de usuarios y proyectos

### ✅ Módulo de Inspección del Sitio
- Carga de imágenes del sitio
- Herramientas de dibujo interactivo:
  - **Dibujo Libre**: Para representar cables y conexiones eléctricas
  - **Marcadores**: Para identificar equipos específicos
    - Transformador
    - Medidor
    - Tablero (con breakers, relés, contactores, arranque suave)
    - Poste
    - Puesta a Tierra
    - Pozo de Revisión
- **Análisis con IA (OpenAI GPT-5.2)**: Identificación automática de postes, redes MT, distancias estimadas y recomendaciones técnicas
- Exportación de inspecciones en formato JSON

### ✅ Módulo de Cálculo de Demanda Eléctrica
- Cálculo según formato EEASA "Cálculo de la demanda"
- Tablas para:
  - Circuitos de Alumbrado y Tomacorrientes
  - Cargas Especiales
- Cálculos automáticos:
  - Carga Total Instalada (W)
  - Demanda Total (kW)
  - Demanda Total (kVA)
  - **Selección automática de transformador** (5, 10, 15, 37.5, 50, 75, 100, 125, 150, 175, 250 kVA)
- Factor de demanda y factor de potencia configurables

### ✅ Módulo de Cálculo de Caída de Voltaje
Implementa el **método normativo kVA·m / kVA·km** según archivos proporcionados:

**Baja Tensión (Secundarios):**
- Entrada por tramos con:
  - Longitud (m)
  - Número de clientes
  - Demanda (kVA)
  - Número de conductores
  - Tipo y calibre de conductor
  - Factor de Caída de Voltaje (FCV)
- Cálculo de:
  - kVA acumulado (desde extremo hacia fuente)
  - kVA·m por tramo
  - % Caída por tramo
  - % Caída total
- **Validación automática**: ✓ Cumple / ✗ No cumple con límite

**Media Tensión (Primarios):**
- Similar estructura para circuitos MT
- Cálculo con kVA·km
- Validación contra límite de caída

### ✅ Módulo de Presupuesto (APU)
- Tablas editables para:
  - Materiales y Equipos
  - Mano de Obra
  - Desmantelamiento
- Cálculos automáticos:
  - Subtotal Directo
  - Administración (%)
  - Utilidad (%)
  - IVA (%)
  - **Total del Presupuesto**
- Estructura compatible con formatos de empresas eléctricas ecuatorianas

### ✅ Base de Datos Inicializada
Se incluyen datos de muestra:
- 10 materiales y equipos comunes (transformadores, cables, postes, aisladores)
- 4 tipos de conductores con sus factores FCV y kVA·m

## Tecnologías

**Backend:**
- FastAPI (Python)
- MongoDB (Motor async)
- OpenAI GPT-5.2 (vía emergentintegrations)
- JWT para autenticación
- bcrypt para passwords

**Frontend:**
- React 18
- React Konva (canvas de dibujo)
- Recharts (gráficos)
- Sonner (notificaciones)
- Diseño custom con:
  - Fuentes: Manrope (headings), Inter (body), JetBrains Mono (data)
  - Colores: Engineering Slate (#0F172A) + Electric Sky (#0EA5E9)
  - Estilo: Swiss & High-Contrast

## Estructura del Proyecto

```
/app
├── backend/
│   ├── server.py          # API principal con todos los endpoints
│   ├── requirements.txt   # Dependencias Python
│   └── .env              # Variables de entorno
├── frontend/
│   ├── src/
│   │   ├── App.js        # Componente principal
│   │   ├── pages/        # Login, Register, Dashboard, ProjectView
│   │   └── modules/      # InspectionModule, DemandModule, VoltageDropModule, BudgetModule
│   └── package.json
└── scripts/
    └── seed_database.py   # Script de inicialización de DB
```

## Endpoints API Implementados

### Autenticación
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `GET /api/auth/me` - Obtener usuario actual

### Proyectos
- `POST /api/projects` - Crear proyecto
- `GET /api/projects` - Listar proyectos del usuario
- `GET /api/projects/{id}` - Obtener proyecto específico

### Inspección
- `POST /api/inspection/analyze` - Análisis de imagen con IA
- `POST /api/inspection/save-drawing` - Guardar dibujos

### Cálculos
- `POST /api/demand/calculate` - Calcular demanda eléctrica
- `POST /api/voltage-drop/calculate` - Calcular caída de voltaje

### Presupuesto
- `POST /api/budget/generate` - Generar presupuesto APU

### Base de Datos
- `GET /api/materials` - Listar materiales
- `POST /api/materials` - Crear material
- `GET /api/conductors` - Listar conductores

## Módulos Pendientes de Desarrollo Completo

### 📋 Base de Datos de Materiales
- Importación de archivos Excel:
  - "Costos de equipos y materiales.xlsx"
  - "Mano de Obra.xlsx"
  - "desmantelamiento.xlsx"
  - "KVA-m Electrical Conductor.xlsx"
- CRUD completo de materiales
- Búsqueda y filtrado avanzado

### 📊 Módulo de Reportes
Generación automática de documentos según formatos EEASA:
- Autorización del propietario
- Solicitud de factibilidad del servicio
- Solicitud de fiscalización y energización
- Solicitud de suspensión de servicio
- Memoria técnica
- Diagrama unifilar del proyecto
- Exportación a PDF/Excel

### 🔌 Módulo de Diseño de Red
- Generación de diagrama unifilar automático
- Estructura completa:
  - Cortacircuitos
  - Pararrayos
  - Bajante
  - Transformador (poste/padmounted)
  - Medidor
  - Tablero con equipos internos (breakers, relés, contactores, VFD)
- Visualización tipo CAD simplificado

## Caso de Prueba Base

El sistema puede resolver automáticamente el caso definido en los requerimientos:
- 2 motores de 60 kVA
- Carga adicional 5 kVA
- Sistema trifásico 220 V
- Red MT: 13.8 kV
- Distancia: 15 m

**Resultados esperados:**
- ✓ Demanda calculada: ~125 kVA
- ✓ Transformador seleccionado: 150 kVA
- ✓ Corriente calculada: ~360 A
- ✓ Conductores: 2/0 doble por fase (recomendado)
- ✓ Presupuesto generado con APU completo

## Próximas Mejoras

1. **Integración completa de archivos Excel** proporcionados por el usuario
2. **Generación de reportes oficiales** en PDF
3. **Módulo de diseño de red** con diagramas unifilares
4. **Sugerencias inteligentes**: 
   - Mejor tipo de transformador
   - Configuración más económica
   - Alertas de sobrecarga y caída de voltaje alta
5. **Exportación completa** de proyectos

## Normativa y Estándares

- Normativa ecuatoriana CNEL
- Normativa EEASA (Empresa Eléctrica Ambato)
- Factores de caída de voltaje según tablas kVA·m
- Capacidades estándar de transformadores monofásicos y trifásicos

## Credenciales de Emergent LLM

El sistema utiliza la clave universal de Emergent para análisis de imágenes con OpenAI GPT-5.2:
- Clave: `EMERGENT_LLM_KEY` (ya configurada en `.env`)
- Modelo: `gpt-5.2` con capacidades de visión

---

**Desarrollado con ElectroDesign Pro**
Sistema profesional para ingenieros eléctricos en Ecuador
