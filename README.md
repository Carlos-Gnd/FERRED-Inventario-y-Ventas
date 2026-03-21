# FERRED — Sistema de Inventario y Ventas

> Sistema de escritorio offline-first para gestión de inventario, ventas y facturación electrónica DTE en ferretería con múltiples sucursales.

**Universidad de Oriente — Facultad de Ingeniería y Arquitectura**  
`AMDS | ciclo I-2026` · `Grupo 2` · **Developers Group**

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Credenciales](#-credenciales-de-acceso-entorno-de-prueba)
- [Stack Tecnológico](#-stack-tecnológico)
- [Dependencias](#-dependencias-principales)
- [Arquitectura](#-arquitectura)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Roles y Permisos](#-roles-y-permisos)
- [Instalación](#-instalación-y-ejecución)
- [Flujo de trabajo](#-flujo-de-trabajo-con-git)
- [Deploy y Entornos](#-deploy-y-entornos)
- [Equipo](#-equipo)
- [Mejora continua](#-mejora-continua-sprint-1)

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

## 🔐 Credenciales de acceso (entorno de prueba)

> ⚠️ Estas credenciales son solo para pruebas académicas.
ADMIN
Correo: admin@ferred.com

Contraseña: Admin123*

CAJERO
Correo: cajero@ferred.com

Contraseña: Cajero123*

BODEGA
Correo: bodega@ferred.com

Contraseña: Bodega123*



---

## 🛠 Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | v20 LTS |
| Package manager | pnpm | v9+ |
| Frontend | React + Vite + Tailwind CSS | v18 / v5 / v3 |
| Estado global | Zustand | v4 |
| Desktop | ElectronJS | v30 |
| Backend | Express.js | v4 |
| ORM | Prisma ORM | v5 |
| BD local | SQLite | — |
| BD nube | Supabase / PostgreSQL 15 | hosted |
| Autenticación | JWT + Bcrypt | v9 / v5 |
| Seguridad HTTP | Helmet + express-rate-limit | v7 / v7 |
| UI/UX Design | Figma | — |
| Control de versiones | GitHub | — |

---

## 📦 Dependencias principales

### 🔹 Backend
express
cors
helmet
express-rate-limit
jsonwebtoken
bcrypt
prisma
better-sqlite3
dotenv


### 🔹 Frontend
react
react-dom
vite
axios
zustand
tailwindcss


### 🔹 Desktop
electron
electron-builder


---

## 🏗 Arquitectura

El sistema sigue una **Arquitectura Hexagonal (Ports & Adapters)** en el backend.
ELECTRON (Desktop)
├── Renderer (React + Vite)
├── Main Process (Electron)
└── Express Server
├── Adapters (http, db, sync, dte)
└── SQLite local

Sincronización → Supabase (PostgreSQL)

---

## 📦 Módulos del Sistema

- Gestión de inventario  
- Ventas y facturación  
- Control de usuarios  
- Reportes  
- Sincronización entre sucursales  
- Facturación electrónica DTE  

---

## 👥 Roles y Permisos

| Acción | Admin | Cajero | Bodega |
|--------|:-----:|:------:|:------:|
| Gestionar usuarios | ✅ | ❌ | ❌ |
| Configurar precios | ✅ | ❌ | ❌ |
| Ver reportes | ✅ | ❌ | ❌ |
| Registrar ventas | ✅ | ✅ | ❌ |
| Gestionar inventario | ✅ | ❌ | ✅ |
| Consultar stock | ✅ | ✅ | ✅ |

---

## ⚙️ Instalación y ejecución

```bash
# Clonar repositorio
git clone https://github.com/tu-repo/ferred.git

# Instalar dependencias
pnpm install

# Ejecutar proyecto
pnpm run dev

# Ejecutar electron
pnpm run electron

🌿 Flujo de trabajo con Git
# Crear rama
git checkout -b feature/nueva-funcionalidad

# Agregar cambios
git add .

# Commit
git commit -m "feat: descripción del cambio"

# Subir rama
git push origin feature/nueva-funcionalidad

🚀 Deploy y Entornos
| Entorno       | URL                                                      | Rama |
| ------------- | -------------------------------------------------------- | ---- |
| Frontend      | [https://ferred.netlify.app](https://ferred.netlify.app) | main |
| Backend       | ferred.onrender.com                                      | main |
| Base de datos | Supabase                                                 | —    |


👨‍💻 Equipo
| Nombre            | Código    | Rol Scrum         | Responsabilidad           |
| ----------------- | --------- | ----------------- | ------------------------- |
| Mauricio Bustillo | u20240840 | **Product Owner** | Gestión de requerimientos |
| Lenin Hernández   | u20240830 | **Scrum Master**  | Coordinación del equipo   |
| Carlos Granados   | u20240579 | Developer         | Infraestructura           |
| René Pacheco      | u20240844 | Developer         | APIs                      |
| Nelson Rodríguez  | u20240270 | Developer         | Frontend                  |
| Kevin Guardado    | u20241103 | Developer         | Deploy                    |
| Bremond Hernández | u20240827 | Developer         | Backend                   |
| Henry Portillo    | u20240848 | Developer         | Testing                   |

<div align="center"> <sub>FERRED · Developers Group · Universidad de Oriente · 2026</sub> </div> ```
