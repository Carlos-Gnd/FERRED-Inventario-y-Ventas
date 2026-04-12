'use strict';
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;

function getDbPath(branchId) {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, `ferred_branch${branchId}.db`);
}

function initDb(branchId = '1') {
  try {
    const Database = require('better-sqlite3');
    const dbPath = getDbPath(branchId);

    console.log(`[SQLite] Inicializando BD local en: ${dbPath}`);

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schemaPath = path.join(__dirname, 'sqlite.schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schema);
      console.log('[SQLite] Schema aplicado correctamente');
    } else {
      console.error('[SQLite] No se encontro el archivo schema.sql');
    }

    return db;
  } catch (err) {
    console.error('[SQLite] Error al inicializar:', err.message);
    return null;
  }
}

function getDb() {
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('[SQLite] Base de datos cerrada');
  }
}

module.exports = { initDb, getDb, closeDb };