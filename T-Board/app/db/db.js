const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS column_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER,
    title TEXT NOT NULL,
    type TEXT CHECK(type IN ('column','row')),
    is_done_status INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER,
    column_id INTEGER,
    row_id INTEGER DEFAULT 1,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#f6dd3bff',
    FOREIGN KEY(board_id) REFERENCES boards(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS task_tags (
    task_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY(task_id, tag_id),
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sub_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    title TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    completed INTEGER DEFAULT 0,
    FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
  )`);
  
});

db.run('PRAGMA foreign_keys = ON');

module.exports = db;