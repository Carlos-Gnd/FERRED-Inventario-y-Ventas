# FERRED — Sistema de Inventario, Ventas y Ecommerce

> Sistema integral para gestión de inventario, ventas, facturación electrónica DTE y ventas online en ferretería con múltiples sucursales.

**Universidad de Oriente — Facultad de Ingeniería y Arquitectura**  
`AMDS | ciclo I-2026` · `Grupo 2` · **Developers Group**

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Aplicaciones](#-aplicaciones-del-proyecto)
- [Módulo Ecommerce](#-módulo-ecommerce)
- [Roles y Permisos](#-roles-y-permisos)
- [Deploy y Entornos](#-deploy-y-entornos)
- [Desarrollo Local](#-desarrollo-local)
- [Acceso al Sistema](#-acceso-al-sistema)
- [Equipo](#-equipo)

---

## 📖 Descripción

FERRED es un sistema compuesto por dos frontends complementarios sobre un mismo backend:

- **App de gestión interna** — Aplicación de escritorio (ElectronJS) con soporte **offline-first**, sincronización automática con la nube al detectar conexión, y gestión completa de inventario, ventas y DTE.
- **Tienda online (Ecommerce)** — Aplicación web pública donde los clientes pueden explorar el catálogo, armar su carrito y realizar pedidos con retiro en sucursal o envío a domicilio.

### Problema que resuelve

- Control manual en Excel por sucursal → desabastecimiento y pérdida de datos
- Sin visibilidad consolidada entre sucursales en tiempo real
- Sin facturación electrónica DTE conforme al Ministerio de Hacienda
- Sin canal de ventas online para clientes externos

### Solución

Sistema web-responsive empaquetado en Electron con SQLite local por sucursal, sincronización automática con Supabase (PostgreSQL), emisión de DTE y tienda online pública integrada al mismo inventario en tiempo real.

---

## 🛠 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | v22 LTS |
| Package manager | pnpm (workspace monorepo) | v9+ |
| Frontend — gestión | React + Vite + Tailwind CSS + Zustand | v18 / v5 / v3 / v4 |
| Frontend — ecommerce | React + Vite + Tailwind CSS v4 + shadcn/ui | v18 / v6 / v4 |
| Desktop | ElectronJS | v30 |
| Backend | Express.js (Arquitectura Hexagonal) | v4 |
| ORM | Prisma ORM | v5 |
| BD local | SQLite (better-sqlite3) | — |
| BD nube | Supabase / PostgreSQL 15 | hosted |
| Autenticación | JWT + bcryptjs | v9 / v3 |
| Seguridad HTTP | Helmet + express-rate-limit | v7 / v7 |
| UI/UX Design | Figma | — |
| Control de versiones | GitHub | — |

---

## 🏗 Arquitectura

El sistema sigue una **Arquitectura Hexagonal (Ports & Adapters)** en el backend. Ambos frontends consumen el mismo servidor Express.

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│   GESTIÓN INTERNA (Electron) │   │      ECOMMERCE (Web pública) │
│   React + Zustand            │   │   React + Tailwind v4        │
│   http://localhost:5173      │   │   http://localhost:5175      │
└──────────────┬───────────────┘   └───────────────┬──────────────┘
               │ Axios /api (JWT)                   │ fetch /api (público)
               └────────────────┬──────────────────┘
                                 │
               ┌─────────────────▼──────────────────┐
               │          Express.js Server          │
               │          :3001                      │
               │  ┌──────────────────────────────┐  │
               │  │  ADAPTERS                    │  │
               │  │  http/ · db/ · sync/         │  │
               │  │  printer/ · dte/             │  │
               │  └──────────────────────────────┘  │
               └──────────────┬──────────────────────┘
                              │
               ┌──────────────▼──────────────────────┐
               │          SQLite local               │
               │        (una por sucursal)           │
               └──────────────┬──────────────────────┘
                              │ HTTPS (cuando hay internet)
               ┌──────────────▼──────────────────────┐
               │          Supabase (PgSQL)           │
               │          + Railway API              │
               └─────────────────────────────────────┘
```

---

## 📦 Aplicaciones del Proyecto

| App | Directorio | Puerto | Descripción |
|-----|-----------|--------|-------------|
| **server** | `apps/server` | 3001 | API REST — Express + Prisma + SQLite |
| **renderer** | `apps/renderer` | 5173 | Panel de gestión interna (POS, inventario, reportes) |
| **ecommerce** | `apps/ecommerce` | 5175 | Tienda online pública |
| **electron** | `apps/electron` | — | Empaquetado de escritorio (envuelve renderer) |

---

## 🛒 Módulo Ecommerce

### Descripción general

La tienda online permite a clientes externos explorar el catálogo actualizado en tiempo real, agregar productos al carrito y realizar pedidos con dos modalidades de entrega.

### Rutas disponibles

| Ruta | Descripción |
|------|-------------|
| `/` | Home — presentación de la tienda |
| `/catalogo` | Catálogo filtrable por categoría, stock y precio |
| `/producto/:id` | Detalle de producto con productos relacionados |
| `/carrito` | Carrito de compras (persistido en `localStorage`) |
| `/checkout` | Finalizar compra — datos del cliente y tipo de entrega |
| `/pedido/:id/exito` | Confirmación de pedido con número de orden |
| `/sucursales` | Información de sucursales físicas |
| `/como-comprar` | Guía de compra para el cliente |

### Tipos de entrega

| Tipo | Descripción | Costo |
|------|-------------|-------|
| **RETIRO** | El cliente retira en la sucursal cuyo catálogo consultó | $0.00 |
| **ENVÍO** | Se selecciona una zona de envío configurada en el sistema | Según zona |

### Variables de entorno

Crear el archivo `apps/ecommerce/.env` (ya incluido, no subir a git):

```env
VITE_API_URL=http://localhost:3001/api
```

En producción esta variable debe apuntar al backend desplegado en Railway.

### Endpoints del API que consume

| Endpoint | Método | Auth | Propósito |
|----------|--------|------|-----------|
| `/api/productos/publico/:sucursalId` | GET | No | Catálogo de productos con stock disponible |
| `/api/zonas-envio` | GET | No | Zonas y costos de envío configurados |
| `/api/pedidos-online` | POST | No | Crear un nuevo pedido |

### Gestión de pedidos en el panel interno

El módulo **Pedidos Online** del renderer (`/pedidos-online`) permite al equipo interno gestionar los pedidos recibidos desde la tienda:

- Tabla filtrable por sucursal, estado y rango de fechas
- Modal de detalle: cliente, items, totales, costo de envío
- Cambio de estado con máquina de transiciones validada
- Indicador de entrega por estado
- Actualización automática cada **30 segundos**
- Rol BODEGA: solo visualiza pedidos de su sucursal asignada

**Flujo de estados de un pedido:**

```
RECIBIDO → PREPARANDO → LISTO → ENTREGADO
    ↓           ↓          ↓
 CANCELADO  CANCELADO  CANCELADO
```

---

## 👥 Roles y Permisos

### Panel de gestión interna

| Acción | Admin | Cajero | Bodega |
|--------|:-----:|:------:|:------:|
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Configurar precios | ✅ | ❌ | ❌ |
| Ver reportes consolidados | ✅ | ❌ | ✅ |
| Registrar ventas | ✅ | ✅ | ❌ |
| Gestionar inventario | ✅ | ❌ | ✅ |
| Consultar stock | ✅ | ✅ | ✅ |
| Recepción de proveedores | ✅ | ❌ | ✅ |
| Ver pedidos online (todas las sucursales) | ✅ | ❌ | ❌ |
| Ver pedidos online (su sucursal) | ✅ | ❌ | ✅ |
| Cambiar estado de pedidos online | ✅ | ❌ | ✅ |

### Ecommerce (público)

El ecommerce es de acceso libre — cualquier cliente puede navegar el catálogo y realizar pedidos sin registrarse.

---

## 🚀 Deploy y Entornos

| Entorno | URL | Rama | Deploy |
|---------|-----|------|--------|
| Panel de gestión (producción) | https://ferred.netlify.app | `main` | Automático (Netlify) |
| Backend (producción) | https://server-production-3252.up.railway.app | `main` | Automático (Railway) |
| Base de datos | Supabase — credenciales privadas | — | Siempre activo |

---

## 💻 Desarrollo Local

### Requisitos

- Node.js v22 LTS
- pnpm v9+

### Instalación

```bash
# Clonar el repositorio
git clone <url-del-repo>
cd FERRED-Inventario-y-Ventas

# Instalar todas las dependencias del monorepo
pnpm install

# Configurar la base de datos local
pnpm db:setup
```

### Iniciar en desarrollo

```bash
# Backend (requerido por todos los frontends)
pnpm dev:server

# Panel de gestión interna
pnpm dev:renderer

# Tienda online ecommerce
pnpm dev:ecommerce

# Electron (requiere renderer y server corriendo)
pnpm dev:electron
```

### Variables de entorno necesarias

| Archivo | Variable | Descripción |
|---------|----------|-------------|
| `apps/server/.env` | `DATABASE_URL` | Ruta al archivo SQLite |
| `apps/server/.env` | `JWT_SECRET` | Clave secreta para tokens |
| `apps/ecommerce/.env` | `VITE_API_URL` | URL base del API (`http://localhost:3001/api`) |

---

## 🔐 Acceso al Sistema

> **Panel de gestión:** https://ferred.netlify.app

Credenciales disponibles para pruebas en producción:

| Rol | Correo | Contraseña | Permisos |
|-----|--------|------------|----------|
| **Administrador** | admin@ferred.com | admin123 | Acceso total al sistema |
| **Cajero** | cajero@ferred.com | cajero123 | Ventas y consulta de stock |
| **Bodeguero** | bodega@ferred.com | bodega123 | Inventario, recepción y pedidos online de su sucursal |

---

## 👨‍💻 Equipo

| Nombre | Código | Rol Scrum | Responsabilidad técnica |
|--------|--------|-----------|------------------------|
| Carlos Alberto Granados Amaya | u20240579 | Líder de Desarrollo | Arquitectura backend, seguridad, infraestructura y deploy, QA general |
| Mauricio Antonio Bustillo Rosales | u20240840 | Product Owner | Definición y priorización del backlog, gestión de historias de usuario, validación de entregables con el cliente |
| Lenin Alejandro Hernández Coreas | u20240830 | Scrum Master | Facilitación de ceremonias Scrum, gestión de impedimentos, métricas de velocidad del equipo |
| René Francisco Pacheco Araniva | u20240844 | Developer | Diseño UI/UX en Figma, ecommerce (setup, páginas, flujo de compra) y módulo pedidos online en renderer |
| Nelson René Rodríguez Quintanilla | u20240270 | Developer | Servicios externos, sincronización offline-first, SyncService y endpoints de pedidos online |
| Kevin Bladimir Guardado Ortez | u20241103 | Developer | Testing e integración — pruebas E2E, validación de flujos offline/online, reporte de bugs |
| Bremond Antony Hernández Coreas | u20240827 | Developer | Lógica de negocio — módulo de ventas, POS, cálculo de precios e IVA, emisión de tickets |
| Henry Fernando Portillo Luna | u20240848 | Developer | Desarrollo frontend — React + Zustand + Tailwind, vistas de inventario, productos y dashboard |

---

<div align="center">
  <sub>FERRED · Developers Group · Universidad de Oriente · AMDS ciclo I-2026</sub>
</div>
