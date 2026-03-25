use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use serde::Serialize;
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const DB_FILENAME: &str = "app.db";
pub const LUTS_DIR: &str = "luts";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LutEntry {
    pub id: i64,
    pub filename: String,
    pub label: String,
    pub stored_path: String,
    pub added_at: String,
}

pub struct DbState(pub Mutex<Connection>);

pub fn init_db(app: &AppHandle) -> Result<DbState> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .context("Failed to resolve app data directory")?;

    fs::create_dir_all(&app_data_dir).context("Failed to create app data directory")?;

    let db_path = app_data_dir.join(DB_FILENAME);
    let conn = Connection::open(&db_path)
        .with_context(|| format!("Failed to open database at {}", db_path.display()))?;

    conn.pragma_update(None, "journal_mode", "WAL")
        .context("Failed to enable WAL journal mode")?;

    migrate(&conn).context("Failed to run database migrations")?;

    Ok(DbState(Mutex::new(conn)))
}

fn migrate(conn: &Connection) -> Result<()> {
    let version: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    if version < 1 {
        conn.execute_batch(
            "CREATE TABLE camera_luts (
                camera_key  TEXT PRIMARY KEY,
                lut_path    TEXT NOT NULL,
                last_used   TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )?;
        conn.pragma_update(None, "user_version", 1)?;
    }

    if version < 2 {
        conn.execute_batch(
            "CREATE TABLE luts (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                filename    TEXT NOT NULL,
                label       TEXT NOT NULL,
                stored_path TEXT NOT NULL UNIQUE,
                added_at    TEXT NOT NULL DEFAULT (datetime('now'))
            );",
        )?;
        conn.pragma_update(None, "user_version", 2)?;
    }

    if version < 3 {
        conn.execute_batch(
            "CREATE TABLE settings (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );",
        )?;
        conn.pragma_update(None, "user_version", 3)?;
    }

    Ok(())
}

// -- camera_luts CRUD --

pub fn set_lut(conn: &Connection, camera_key: &str, lut_path: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO camera_luts (camera_key, lut_path, last_used)
         VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(camera_key) DO UPDATE SET
            lut_path = excluded.lut_path,
            last_used = excluded.last_used",
        params![camera_key, lut_path],
    )?;
    Ok(())
}

pub fn get_all_camera_luts(conn: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt =
        conn.prepare("SELECT camera_key, lut_path FROM camera_luts ORDER BY last_used DESC")?;

    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn delete_camera_luts_by_lut_path(conn: &Connection, lut_path: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM camera_luts WHERE lut_path = ?1",
        params![lut_path],
    )?;
    Ok(())
}

// -- luts CRUD --

pub fn add_lut(conn: &Connection, filename: &str, label: &str, stored_path: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO luts (filename, label, stored_path) VALUES (?1, ?2, ?3)",
        params![filename, label, stored_path],
    )?;
    Ok(())
}

pub fn get_all_luts(conn: &Connection) -> Result<Vec<LutEntry>> {
    let mut stmt =
        conn.prepare("SELECT id, filename, label, stored_path, added_at FROM luts ORDER BY label")?;

    let rows = stmt.query_map([], |row| {
        Ok(LutEntry {
            id: row.get(0)?,
            filename: row.get(1)?,
            label: row.get(2)?,
            stored_path: row.get(3)?,
            added_at: row.get(4)?,
        })
    })?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn delete_lut(conn: &Connection, id: i64) -> Result<()> {
    conn.execute("DELETE FROM luts WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn update_lut_label(conn: &Connection, id: i64, label: &str) -> Result<()> {
    conn.execute(
        "UPDATE luts SET label = ?1 WHERE id = ?2",
        params![label, id],
    )?;
    Ok(())
}

// -- settings CRUD --

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>> {
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match result {
        Ok(val) => Ok(Some(val)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_all_settings(conn: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;
    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}
