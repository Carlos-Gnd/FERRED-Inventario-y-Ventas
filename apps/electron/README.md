# Electron — FERRED Desktop App

## Estructura de archivos

```
apps/electron/
├── main.js              ← Proceso principal (window, server, tray, menú)
├── preload.js           ← Puente seguro main ↔ renderer (contextBridge)
├── package.json         ← Deps + config electron-builder
├── .env                 ← BRANCH_ID, ELECTRON_RENDERER_URL
├── ipc/
│   ├── printer.ipc.js   ← Impresora térmica POS
│   └── server.ipc.js    ← Estado del servidor Express embebido
└── resources/
    ├── icon.png         ← Ícono Linux / fallback (256x256)
    ├── icon.ico         ← Ícono Windows (multi-resolución)
    └── icon.icns        ← Ícono macOS
```

---

## Instalar dependencias

```bash
cd apps/electron
pnpm install

# Opcional — impresora térmica POS
pnpm add electron-pos-printer
```

---

## Correr en desarrollo

Desde la raíz del monorepo:

```bash
pnpm install           # instalar todo
pnpm db:migrate        # crear SQLite local
pnpm db:seed           # datos de prueba

pnpm dev               # arranca todo: servidor + renderer + electron
```

Internamente ejecuta en paralelo:
1. `pnpm dev:server` → Express en localhost:3001
2. `pnpm dev:renderer` → Vite en localhost:5173
3. `pnpm dev:electron` → Electron (espera a que los dos anteriores estén up)

---

## Usar `electronAPI` en el renderer

```ts
// apps/renderer/src/hooks/useElectron.ts
import { useElectron } from '../hooks/useElectron';

function MiComponente() {
  const electron = useElectron();

  // Imprimir ticket POS
  async function imprimir() {
    const result = await electron.printTicket({
      sucursal: 'Sucursal Central',
      cajero:   'María Soto',
      total:    45.80,
      tipoDte:  '01',
      items: [
        { nombre: 'Martillo 16oz', cantidad: 1, precio: 14.50 },
        { nombre: 'Tornillos x50', cantidad: 2, precio: 3.25 },
      ],
    });

    if (result.ok) console.log('Impreso ✓');
    else console.error(result.error);
  }
}
```

---

## Buildear para producción

```bash
# Windows (.exe installer)
pnpm build:win

# macOS (.dmg)
pnpm build:mac

# Linux (.AppImage)
pnpm build:linux
```

El instalador queda en `dist-electron/`.

---

## Configurar sucursal

Editar `apps/electron/.env`:

```env
BRANCH_ID=1   # Sucursal 1
# BRANCH_ID=2 # Sucursal 2
```

Cada sucursal tendrá su propio archivo SQLite en:
`%APPDATA%/ferred-app/ferred_branch1.db` (Windows)
`~/Library/Application Support/ferred-app/ferred_branch1.db` (macOS)

---

## Agregar íconos

Coloca los íconos en `apps/electron/resources/`:

| Archivo | Resolución | Plataforma |
|---|---|---|
| `icon.ico` | Multi (256,128,64,32,16) | Windows |
| `icon.icns` | Multi-resolución | macOS |
| `icon.png` | 512x512 | Linux |
| `icon-tray.png` | 16x16 o 22x22 | Tray (todas) |

---

## Seguridad

- `contextIsolation: true` — renderer NO accede a Node.js directamente
- `nodeIntegration: false` — sin acceso directo al filesystem desde renderer
- Solo las funciones declaradas en `preload.js` son accesibles desde React
- El servidor Express corre en proceso separado (fork) con su propio env