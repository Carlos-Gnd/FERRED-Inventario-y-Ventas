# FERRED — Sistema de Inventario y Ventas

> Sistema de escritorio offline-first para gestión de inventario, ventas y facturación electrónica DTE en ferretería con múltiples sucursales.

**Universidad de Oriente — Facultad de Ingeniería y Arquitectura**  
`AMDS | ciclo I-2026` · `Grupo 2` · **Developers Group**

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Stack Tecnológico](#-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Roles y Permisos](#-roles-y-permisos)
- [Deploy y Entornos](#-deploy-y-entornos)
- [Acceso al Sistema](#-acceso-al-sistema)
- [Equipo](#-equipo)

---

## 📖 Descripción

FERRED es una aplicación de escritorio construida con **ElectronJS** que permite operar **100% sin internet**, sincronizando automáticamente con la nube al detectar conexión.

### Problema que resuelve

- Control manual en Excel por sucursal → desabastecimiento y pérdida de datos
- Sin visibilidad consolidada entre sucursales en tiempo real
- Sin facturación electrónica DTE conforme al Ministerio de Hacienda

### Solución

Sistema web-responsive empaquetado en Electron con SQLite local por sucursal, sincronización automática con Supabase (PostgreSQL) y emisión de DTE para el Ministerio de Hacienda de El Salvador.

---

## 🛠 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | v22 LTS |
| Package manager | pnpm | v9+ |
| Frontend | React + Vite + Tailwind CSS | v18 / v5 / v3 |
| Estado global | Zustand | v4 |
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

El sistema sigue una **Arquitectura Hexagonal (Ports & Adapters)** en el backend.

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON (Desktop)                    │
│  ┌─────────────────────┐   ┌───────────────────────┐   │
│  │   Renderer Process  │   │    Main Process       │   │
│  │   React + Vite      │◄──│    main.js            │   │
│  │   Tailwind + Zustand│   │    preload.js         │   │
│  └────────┬────────────┘   └──────────┬────────────┘   │
│           │ Axios /api                │ IPC             │
│  ┌────────▼───────────────────────────▼────────────┐   │
│  │              Express.js Server                   │   │
│  │  ┌────────────────────────────────────────────┐  │   │
│  │  │  ADAPTERS                                  │  │   │
│  │  │  http/ · db/ · sync/ · printer/ · dte/     │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  └──────────────────────┬──────────────────────────┘   │
│              ┌───────────▼──────────┐                  │
│              │    SQLite local      │                  │
│              │  (una por sucursal)  │                  │
│              └──────────────────────┘                  │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (cuando hay internet)
              ┌────────▼─────────────┐
              │   Supabase (PgSQL)   │
              │   + Railway API      │
              └──────────────────────┘
```

---

## 👥 Roles y Permisos

| Acción | Admin | Cajero | Bodega |
|--------|:-----:|:------:|:------:|
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Configurar precios | ✅ | ❌ | ❌ |
| Ver reportes consolidados | ✅ | ❌ | ❌ |
| Registrar ventas | ✅ | ✅ | ❌ |
| Gestionar inventario | ✅ | ❌ | ✅ |
| Consultar stock | ✅ | ✅ | ✅ |
| Recepción de proveedores | ✅ | ❌ | ✅ |

---

## 🚀 Deploy y Entornos

| Entorno | URL | Rama | Deploy |
|---------|-----|------|--------|
| Frontend (producción) | https://ferred.netlify.app | `main` | Automático (Netlify) |
| Backend (producción) | https://server-production-3252.up.railway.app | `main` | Automático (Railway) |
| Base de datos | Supabase — credenciales privadas | — | Siempre activo |

---

## 🔐 Acceso al Sistema

> **URL:** https://ferred.netlify.app

Las siguientes credenciales están disponibles para pruebas en el entorno de producción:

| Rol | Correo | Contraseña | Permisos |
|-----|--------|------------|----------|
| **Administrador** | admin@ferred.com | admin123 | Acceso total al sistema |
| **Cajero** | cajero@ferred.com | cajero123 | Ventas y consulta de stock |
| **Bodeguero** | bodega@ferred.com | bodega123 | Inventario y recepción |

---

## 👨‍💻 Equipo

| Nombre | Código | Rol Scrum | Responsabilidad técnica |
|--------|--------|-----------|------------------------|
| Carlos Alberto Granados Amaya | u20240579 | Líder de Desarrollo | Arquitectura backend, seguridad, infraestructura y deploy, QA general |
| Mauricio Antonio Bustillo Rosales | u20240840 | Product Owner | Definición y priorización del backlog, gestión de historias de usuario, validación de entregables con el cliente |
| Lenin Alejandro Hernández Coreas | u20240830 | Scrum Master | Facilitación de ceremonias Scrum, gestión de impedimentos, métricas de velocidad del equipo |
| René Francisco Pacheco Araniva | u20240844 | Developer | Diseño UI/UX en Figma, modelado y optimización de base de datos |
| Nelson René Rodríguez Quintanilla | u20240270 | Developer | Servicios externos, sincronización offline-first y SyncService |
| Kevin Bladimir Guardado Ortez | u20241103 | Developer | Testing e integración — pruebas E2E, validación de flujos offline/online, reporte de bugs |
| Bremond Antony Hernández Coreas | u20240827 | Developer | Lógica de negocio — módulo de ventas, POS, cálculo de precios e IVA, emisión de tickets |
| Henry Fernando Portillo Luna | u20240848 | Developer | Desarrollo frontend — React + Zustand + Tailwind, vistas de inventario, productos y dashboard |

---

<div align="center">
  <sub>FERRED · Developers Group · Universidad de Oriente · AMDS ciclo I-2026</sub>
</div>
