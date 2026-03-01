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
