const Database = require("better-sqlite3");

const db = new Database("ai_pipeline.db");

db.exec(`
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT UNIQUE,
    content TEXT,
    classification TEXT,
    summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;