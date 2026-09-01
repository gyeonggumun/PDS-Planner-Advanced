const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 프로젝트 루트 경로에 pds.db 생성
const dbPath = path.resolve(__dirname, '../pds.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // 1. Plan (계획) 테이블
  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    title TEXT NOT NULL,
    period TEXT,
    priority TEXT,
    success_criteria TEXT,
    expected_time INTEGER
  )`);

  // 2. ToDo (할 일) 테이블
  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    deadline TEXT,
    priority TEXT,
    tags TEXT,
    expected_time INTEGER,
    FOREIGN KEY(plan_id) REFERENCES plans(id)
  )`);

  // 3. Do (실행 기록) 테이블
  db.run(`CREATE TABLE IF NOT EXISTS do_records (
    id TEXT PRIMARY KEY,
    todo_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    actual_time INTEGER,
    block_reason TEXT,
    idempotency_key TEXT UNIQUE,
    FOREIGN KEY(todo_id) REFERENCES todos(id)
  )`);
  
  console.log('데이터베이스 및 테이블 초기화 완료');
});

module.exports = db;