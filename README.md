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
| Runtime | Node.js | v20 LTS |
| Package manager | pnpm | v9+ |
| Frontend | React + Vite + Tailwind CSS | v18 / v5 / v3 |
| Estado global | Zustand | v4 |
| Desktop | ElectronJS | v30 |
| Backend | Express.js (Arquitectura Hexagonal) | v4 |
| ORM | Prisma ORM | v5 |
| BD local | SQLite (better-sqlite3) | — |
| BD nube | Supabase / PostgreSQL 15 | hosted |
| Autenticación | JWT + Bcrypt | v9 / v5 |
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
              │   + Sync API REST    │
              └──────────────────────┘
```

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
| Backend (producción) | `ferred.onrender.com` | `main` | Automático (Render) |
| Base de datos | Supabase — credenciales privadas | — | Siempre activo |

> ℹ️ El servidor en Render (plan gratuito) tiene un GitHub Action de ping cada 10 minutos para evitar cold start. Ver `.github/workflows/keep-alive.yml`.

---

## 👨‍💻 Equipo

| Nombre | Código | Rol Scrum | Responsabilidad técnica |
|--------|--------|-----------|------------------------|
| Carlos Alberto Granados Amaya | u20240579 | Product Owner | Arquitectura de seguridad, infraestructura y deploy |
| Mauricio Antonio Bustillo Rosales | u20240840 | Scrum Master | Coordinación de sprints y gestión de impedimentos |
| René Francisco Pacheco Araniva | u20240844 | Developer | Integración de servicios externos y APIs |
| Nelson René Rodríguez Quintanilla | u20240270 | Developer | Interfaces de usuario — productos y stock |
| Lenin Alejandro Hernández Coreas | u20240830 | Developer | Arquitectura y optimización de base de datos |
| Kevin Bladimir Guardado Ortez | u20241103 | Developer | Entorno de producción y estabilidad del sistema |
| Bremond Antony Hernández Coreas | u20240827 | Developer | Lógica de negocio del backend — módulo de ventas |
| Henry Fernando Portillo Luna | u20240848 | Developer | Calidad — pruebas unitarias e integración |

---

<div align="center">
  <sub>FERRED · Developers Group · Universidad de Oriente · AMDS ciclo I-2026</sub>
</div>
