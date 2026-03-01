# 🔧 FERRED — Sistema de Inventario y Ventas

> Sistema de escritorio offline-first para gestión de inventario, ventas y facturación electrónica en ferretería con múltiples sucursales.

**Universidad de Oriente — Facultad de Ingeniería y Arquitectura**  
`AMDS | ciclo I-2026` · `Grupo 2` · **Developers Group**

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Multi-Sucursal](#-solución-multi-sucursal)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Variables de Entorno](#-variables-de-entorno)
- [Scripts Disponibles](#-scripts-disponibles)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Roles y Permisos](#-roles-y-permisos)
- [Sincronización Offline-First](#-sincronización-offline-first)
- [Equipo](#-equipo)

---

## 📖 Descripción

FERRED es una aplicación de escritorio nativa construida con **ElectronJS** que permite a una ferretería con dos sucursales gestionar su inventario y ventas de forma **100% operativa sin internet**, sincronizando automáticamente con la nube cuando detecta conexión.

### Problema que resuelve

El cliente llevaba control manual en archivos Excel independientes por sucursal, lo que causaba:

- Desabastecimiento de productos por falta de sincronización
- Pérdida de tiempo en registro manual
- Imposibilidad de obtener reportes consolidados entre sucursales

### Solución

Un sistema web responsive empaquetado en Electron con base de datos SQLite local por sucursal, sincronización automática con Supabase (PostgreSQL) y emisión de Documentos Tributarios Electrónicos (DTE) para el Ministerio de Hacienda de El Salvador.

---

## 🛠 Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| Runtime | Node.js | v20 LTS |
| Package manager | pnpm | v9+ |
| Diseño UI/UX | Figma | — |
| Frontend | React | v18 |
| Build tool | Vite | v5 |
| CSS | Tailwind CSS | v3 |
| Estado global | Zustand | v4 |
| HTTP cliente | Axios | v1 |
| Desktop | ElectronJS | v30 |
| Impresión térmica | Electron POS Printer | latest |
| Backend | Express.js | v4 |
| Arquitectura backend | Hexagonal (Ports & Adapters) | — |
| ORM | Prisma ORM | v5 |
| BD local | SQLite (better-sqlite3) | — |
| BD nube | Supabase / PostgreSQL 15 | hosted |
| Web server | Nginx | v1.26 |
| Autenticación | JWT (jsonwebtoken) | v9 |
| Hash contraseñas | Bcrypt | v5 |
| Cifrado | CryptoJS | v4 |
| Gestión de tareas | Jira | — |
| Control de versiones | GitHub | — |
| IDE | Visual Studio Code | — |

---

## 🏗 Arquitectura

El sistema sigue una **Arquitectura Hexagonal (Ports & Adapters)** en el backend, garantizando que la lógica de negocio sea completamente independiente de frameworks, bases de datos y servicios externos.

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON (Desktop)                    │
│  ┌─────────────────────┐   ┌───────────────────────┐   │
│  │   Renderer Process  │   │    Main Process       │   │
│  │   React + Vite      │◄──│    main.js            │   │
│  │   Tailwind + Zustand│   │    preload.js         │   │
│  └────────┬────────────┘   └──────────┬────────────┘   │
│           │ Axios (localhost:3001)     │ IPC            │
│  ┌────────▼────────────────────────── ▼────────────┐   │
│  │              Express.js Server                   │   │
│  │         (Arquitectura Hexagonal)                 │   │
│  │  ┌──────────────────────────────────────────┐   │   │
│  │  │  CORE (pura lógica, sin frameworks)      │   │   │
│  │  │  domain/ · ports/ · use-cases/           │   │   │
│  │  └──────────────┬───────────────────────────┘   │   │
│  │                 │ inyección de dependencias      │   │
│  │  ┌──────────────▼───────────────────────────┐   │   │
│  │  │  ADAPTERS                                 │   │   │
│  │  │  db/ · dte/ · http/ · printer/ · sync/   │   │   │
│  │  └──────────────────────────────────────────┘   │   │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                             │
│              ┌────────────▼─────────┐                  │
│              │    SQLite local      │                  │
│              │  (una por sucursal)  │                  │
│              └──────────────────────┘                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (cuando hay internet)
                       │
              ┌────────▼────────────┐
              │   Nginx (Cloud)     │
              │   Express Sync API  │
              │   Supabase (PgSQL)  │
              └─────────────────────┘
```

---

## 🏪 Solución Multi-Sucursal

Cada sucursal opera con la **misma aplicación** pero con un `BRANCH_ID` distinto configurado en su instalación. Este campo actúa como eje central de toda la segregación de datos.

```
Sucursal Central  →  BRANCH_ID=1  →  SQLite propia  ─┐
                                                       ├──► Supabase (consolidado)
Sucursal Norte    →  BRANCH_ID=2  →  SQLite propia  ─┘
```

### ¿Cómo funciona?

1. Al instalar Electron en cada sucursal se configura el `BRANCH_ID` en el `.env`.
2. El middleware `branchGuard` de Express inyecta automáticamente ese filtro en **todas** las queries de Prisma.
3. Ningún cajero puede ver ni modificar datos de otra sucursal.
4. El administrador accede al panel web (Supabase) donde los datos de ambas sucursales se consolidan usando ese mismo `branch_id`.

### Tablas con branch_id

```
products    → catálogo global (sin branch_id)
inventory   → product_id + branch_id + stock + min_stock
sales       → branch_id + user_id + total
users       → branch_id + role
purchases   → branch_id + provider_id
sync_log    → branch_id + table_name + status
```

---

## 📁 Estructura del Proyecto

```
ferred-app/
├── apps/
│   ├── electron/                  # App de escritorio ElectronJS
│   │   ├── main.js                # Proceso principal, arranca Express internamente
│   │   ├── preload.js             # Bridge seguro (contextBridge)
│   │   └── .env                  # BRANCH_ID, API_URL, etc.
│   │
│   ├── renderer/                  # Frontend React embebido en Electron
│   │   └── src/
│   │       ├── pages/             # POS, Inventario, Reportes, Usuarios, Proveedores
│   │       ├── components/        # Componentes reutilizables
│   │       ├── store/             # Zustand: authStore, cartStore, branchStore
│   │       └── services/          # Axios: llamadas a localhost:3001
│   │
│   └── server/                    # Backend Express (Arquitectura Hexagonal)
│       └── src/
│           ├── core/
│           │   ├── domain/        # Entidades: Sale, Product, Inventory, User
│           │   ├── ports/         # Interfaces: InventoryRepository, DTEService
│           │   └── use-cases/     # RegisterSale, UpdateStock, SyncToCloud...
│           └── adapters/
│               ├── db/            # SQLiteInventoryAdapter, SupabaseAdapter (Prisma)
│               ├── dte/           # HaciendaSandboxAdapter, HaciendaProdAdapter
│               ├── http/          # Controladores Express (routes/)
│               ├── printer/       # ElectronPOSPrinterAdapter
│               └── sync/          # SyncService → Supabase
│
├── packages/
│   ├── prisma/                    # Schema compartido, migraciones SQLite y PgSQL
│   └── shared/                    # Tipos TypeScript, constantes, utilidades
│
├── docker-compose.yml             # Nginx + servidor cloud (producción)
├── package.json
└── pnpm-workspace.yaml
```

---

## ✅ Requisitos Previos

Antes de instalar el proyecto asegúrate de tener:

- [Node.js v20 LTS](https://nodejs.org/)
- [pnpm v9+](https://pnpm.io/) — `npm install -g pnpm`
- [Git](https://git-scm.com/)
- Cuenta en [Supabase](https://supabase.com/) (para la sincronización cloud)
- [Visual Studio Code](https://code.visualstudio.com/) (recomendado)

---

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/developers-group/ferred-app.git
cd ferred-app
```

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Configurar variables de entorno

```bash
# Copiar los archivos de ejemplo
cp apps/electron/.env.example apps/electron/.env
cp apps/server/.env.example apps/server/.env
```

Edita los archivos `.env` con tus valores (ver sección [Variables de Entorno](#-variables-de-entorno)).

### 4. Inicializar la base de datos local

```bash
# Generar el cliente Prisma
pnpm --filter @ferred/prisma generate

# Ejecutar migraciones en SQLite local
pnpm --filter @ferred/prisma migrate:local

# Sembrar datos iniciales (sucursales, roles, usuario admin)
pnpm --filter @ferred/prisma seed
```

### 5. Correr en modo desarrollo

```bash
# Levanta React (Vite) + Express + Electron simultáneamente
pnpm dev
```

---

## 🔐 Variables de Entorno

### `apps/electron/.env`

```env
# Identificador de esta sucursal (1 = Central, 2 = Norte)
BRANCH_ID=1

# URL del servidor de sincronización cloud
API_CLOUD_URL=https://api.ferred.com
```

### `apps/server/.env`

```env
# Entorno
NODE_ENV=development

# Puerto del servidor Express local
PORT=3001

# Ruta del archivo SQLite local
DATABASE_URL="file:../../../data/ferred_branch1.db"

# Supabase (para sincronización)
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=8h

# CryptoJS (cifrado de respaldos)
CRYPTO_SECRET=your-crypto-secret-key

# DTE Hacienda
DTE_ENV=sandbox
DTE_SANDBOX_URL=https://apitest.dtes.mh.gob.sv
```

---

## 📜 Scripts Disponibles

```bash
# Desarrollo completo (Electron + React + Express)
pnpm dev

# Solo el frontend React
pnpm --filter @ferred/renderer dev

# Solo el backend Express
pnpm --filter @ferred/server dev

# Build para producción
pnpm build

# Empaquetar Electron (.exe / .AppImage)
pnpm --filter @ferred/electron package

# Ejecutar pruebas
pnpm test

# Migraciones base de datos local
pnpm --filter @ferred/prisma migrate:local

# Migraciones base de datos cloud (Supabase)
pnpm --filter @ferred/prisma migrate:cloud

# Generar cliente Prisma
pnpm --filter @ferred/prisma generate
```

---

## 📦 Módulos del Sistema

| Módulo | Descripción | RF asociado |
|--------|-------------|-------------|
| **Autenticación** | Login con JWT, roles por sucursal | RF-06 |
| **Inventario** | CRUD de productos, gestión híbrida cajas/unidades | RF-02, RF-03 |
| **Ventas (POS)** | Registro de ventas, validación de stock, carrito | RF-01 |
| **Proveedores** | Gestión de proveedores y compras | — |
| **Facturación DTE** | Generación JSON para Hacienda, modo sandbox | RF-04 |
| **Impresión** | Tickets en impresoras térmicas (ESC/POS) | RF-04 |
| **Alertas de Stock** | Notificaciones cuando stock llega al mínimo | RF-07 |
| **Reportes** | Ventas diarias/semanales/mensuales, stock faltante | RF-08 |
| **Sincronización** | Envío automático a Supabase cuando hay internet | RF-05 |

---

## 👥 Roles y Permisos

| Acción | Administrador | Cajero | Bodega |
|--------|:---:|:---:|:---:|
| Ver reportes consolidados | ✅ | ❌ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Configurar precios/descuentos | ✅ | ❌ | ❌ |
| Registrar ventas | ✅ | ✅ | ❌ |
| Consultar stock | ✅ | ✅ | ✅ |
| Gestionar inventario | ✅ | ❌ | ✅ |
| Registrar compras a proveedor | ✅ | ❌ | ✅ |
| Ver reportes de su sucursal | ✅ | ✅ | ✅ |

---

## 🔄 Sincronización Offline-First

El sistema opera **100% sin internet**. La sincronización es un proceso background que no interrumpe la operación.

```
Cajero registra venta
        │
        ▼
  SQLite local ──► sync_log (status: PENDIENTE)
        │
        ▼
  SyncService verifica internet cada 60s
        │
   ┌────┴────┐
   │ offline │  → continúa operando, nada se pierde
   └─────────┘
   │ online  │
   └────┬────┘
        ▼
  Envía batch a Supabase (cifrado con CryptoJS)
        │
        ▼
  sync_log (status: SINCRONIZADO)
        │
        ▼
  Admin ve reportes consolidados en tiempo real
```

> ⏱ Tiempo máximo de sincronización: **< 5 minutos** tras detectar conexión a internet.

---

## 👨‍💻 Equipo

| Nombre | Código | Rol | Responsabilidad |
|--------|--------|-----|----------------|
| Carlos Alberto Granados Amaya | u20240579 | Product Owner | Asegurar que el equipo trabaje en lo que aporta mayor valor al cliente |
| Mauricio Antonio Bustillo Rosales | u20240840 | Scrum Máster | Facilitar que el equipo elimine impedimentos y mejore continuamente |
| René Francisco Pacheco Araniva | u20240844 | Developer | Integrar servicios y APIs externas para la escalabilidad del sistema |
| Nelson René Rodríguez Quintanilla | u20240270 | Developer | Desarrollar interfaces de usuario para la gestión de productos y stock |
| Lenin Alejandro Hernández Coreas | u20240830 | Developer | Diseñar y optimizar la arquitectura de la base de datos |
| Kevin Bladimir Guardado Ortez | u20241103 | Developer | Gestionar el despliegue y estabilidad del entorno de producción |
| Bremond Antony Hernández Coreas | u20240827 | Developer | Implementar la lógica de negocio del backend para ventas |
| Henry Fernando Portillo Luna | u20240848 | Developer | Garantizar la calidad mediante pruebas unitarias y de integración |

---

<div align="center">
  <sub>FERRED · Developers Group · Universidad de Oriente · AMDS ciclo I-2026</sub>
</div>
