use anyhow::{Context, Result};
use rusqlite::{params, Connection};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const DB_FILENAME: &str = "app.db";

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

    match version {
        0 => {
            conn.execute_batch(
                "CREATE TABLE camera_luts (
                    camera_key  TEXT PRIMARY KEY,
                    lut_path    TEXT NOT NULL,
                    last_used   TEXT NOT NULL DEFAULT (datetime('now'))
                );",
            )?;
            conn.pragma_update(None, "user_version", 1)?;
        }
        _ => {}
    }

    Ok(())
}

pub fn get_lut(conn: &Connection, camera_key: &str) -> Option<(String, String)> {
    conn.query_row(
        "SELECT lut_path, last_used FROM camera_luts WHERE camera_key = ?1",
        params![camera_key],
        |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .ok()
}

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

pub fn get_all_luts(conn: &Connection) -> Result<Vec<(String, String)>> {
    let mut stmt =
        conn.prepare("SELECT camera_key, lut_path FROM camera_luts ORDER BY last_used DESC")?;

    let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;

    let mut results = Vec::new();
    for row in rows {
        results.push(row?);
    }
    Ok(results)
}

pub fn delete_lut(conn: &Connection, camera_key: &str) -> Result<()> {
    conn.execute(
        "DELETE FROM camera_luts WHERE camera_key = ?1",
        params![camera_key],
    )?;
    Ok(())
}
