const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS 설정
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(new Error('CORS 정책에 의해 차단된 접근입니다.'));
    }
  },
  credentials: true
}));

app.use(express.json());

// 데이터베이스 초기화
const dbFile = path.join(__dirname, 'pds.db');
const db = new sqlite3.Database(dbFile, (err) => {
  if (err) console.error('DB 연결 실패:', err.message);
  else console.log('SQLite 데이터베이스 연결 완료 (인증 시스템 활성화)');
});

// 테이블 생성 (users 및 기존 소유권 연동 테이블)
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    owner TEXT NOT NULL,
    title TEXT NOT NULL,
    period TEXT NOT NULL,
    success_criteria TEXT,
    expected_time INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    expected_time INTEGER,
    deadline TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS dos (
    id TEXT PRIMARY KEY,
    todo_id TEXT NOT NULL,
    owner TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    actual_time INTEGER,
    block_reason TEXT
  )`);
});

// --- [인증 및 권한 격리 미들웨어] ---
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'] || req.headers['x-scope-id'];
  if (!token) {
    return res.status(401).json({ error: '인증 토큰 또는 세션 정보가 필요합니다. 로그인 후 이용해주세요.' });
  }

  // 사용자의 고유 ID(또는 토큰)를 owner 범위로 지정
  db.get(`SELECT id FROM users WHERE id = ?`, [token], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: '유효하지 않거나 만료된 세션입니다.' });
    }
    req.scope = user.id; // 로그인한 사용자의 ID로 격리
    next();
  });
};

// --- [인증 API 라우트 (로그인 불필요)] ---

// 1. 회원가입
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 모두 입력해주세요.' });
  }

  try {
    // T07-C101 ~ C104: bcrypt를 이용한 안전한 단방향 해시 암호화 (Salt 자동 적용)
    const password_hash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    db.run(
      `INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)`,
      [userId, username, password_hash, new Date().toISOString()],
      function(err) {
        if (err) {
          return res.status(400).json({ error: '이미 사용 중인 아이디입니다.' });
        }
        res.json({ success: true, message: '회원가입이 완료되었습니다.' });
      }
    );
  } catch (e) {
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
  }
});

// 2. 로그인
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    // T07-C99: 아이디가 없거나 비밀번호가 틀렸을 때 동일한 에러 문구 반환 (보안 강화)
    if (err || !user) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 로그인 성공 시 고유 토큰(사용자 ID) 발급
    res.json({
      success: true,
      token: user.id,
      username: user.username,
      message: '로그인 성공'
    });
  });
});

// --- [보호된 데이터 API 라우트 (인증 필수)] ---

app.use('/api/plans', authMiddleware);
app.use('/api/todos', authMiddleware);
app.use('/api/dos', authMiddleware);
app.use('/api/backup', authMiddleware);

// 3. Plan 목록 조회 (내 자료만 조회)
app.get('/api/plans', (req, res) => {
  db.all(`SELECT * FROM plans WHERE owner = ?`, [req.scope], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 4. Plan 생성
app.post('/api/plans', (req, res) => {
  const { id, title, period, success_criteria, expected_time } = req.body;
  const planId = id || crypto.randomUUID();
  
  db.run(
    `INSERT INTO plans (id, owner, title, period, success_criteria, expected_time) VALUES (?, ?, ?, ?, ?, ?)`,
    [planId, req.scope, title, period, success_criteria || '', expected_time || 0],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: planId });
    }
  );
});

// 5. ToDo 목록 조회
app.get('/api/todos', (req, res) => {
  db.all(`SELECT * FROM todos WHERE owner = ?`, [req.scope], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 6. ToDo 생성
app.post('/api/todos', (req, res) => {
  const { id, plan_id, content, status, expected_time, deadline } = req.body;
  const todoId = id || crypto.randomUUID();

  db.run(
    `INSERT INTO todos (id, plan_id, owner, content, status, expected_time, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [todoId, plan_id, req.scope, content, status || 'pending', expected_time || 60, deadline || null],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: todoId });
    }
  );
});

// 7. ToDo 완료 처리 (중복 방지 멱등성)
app.post('/api/todos/:id/complete', (req, res) => {
  const todoId = req.params.id;
  const { start_time, end_time, actual_time, block_reason } = req.body;

  db.get(`SELECT * FROM todos WHERE id = ? AND owner = ?`, [todoId, req.scope], (err, todo) => {
    if (err || !todo) return res.status(404).json({ error: '대상을 찾을 수 없거나 접근 권한이 없습니다.' });

    if (todo.status === 'completed') {
      return res.json({ success: true, message: '이미 완료된 항목입니다. (중복 방지)' });
    }

    db.serialize(() => {
      db.run(`UPDATE todos SET status = 'completed' WHERE id = ? AND owner = ?`, [todoId, req.scope]);
      
      const doId = crypto.randomUUID();
      db.run(
        `INSERT INTO dos (id, todo_id, owner, start_time, end_time, actual_time, block_reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [doId, todoId, req.scope, start_time || new Date().toISOString(), end_time || new Date().toISOString(), actual_time || 60, block_reason || '']
      );

      res.json({ success: true, message: '완료 처리 및 실행 기록 저장 완료' });
    });
  });
});

// 8. See 회고 분석 리포트 집계
app.get('/api/plans/:id/see', (req, res) => {
  const planId = req.params.id;

  db.get(`SELECT * FROM plans WHERE id = ? AND owner = ?`, [planId, req.scope], (err, plan) => {
    if (err || !plan) return res.status(404).json({ error: '계획을 찾을 수 없습니다.' });

    db.all(`SELECT * FROM todos WHERE plan_id = ? AND owner = ?`, [planId, req.scope], (err, todos) => {
      if (err) return res.status(500).json({ error: err.message });

      const total_todos = todos.length;
      const completed_todos = todos.filter(t => t.status === 'completed').length;
      
      const now = new Date();
      const delayed_todos = todos.filter(t => t.status !== 'completed' && t.deadline && new Date(t.deadline) < now).length;

      db.all(`SELECT dos.* FROM dos JOIN todos ON dos.todo_id = todos.id WHERE todos.plan_id = ? AND dos.owner = ?`, [planId, req.scope], (err, dos) => {
        if (err) return res.status(500).json({ error: err.message });

        const blocked_todos = dos.filter(d => d.block_reason && d.block_reason.trim() !== '').length;
        const expected_time = todos.reduce((acc, t) => acc + (t.expected_time || 0), 0);
        const actual_time = dos.reduce((acc, d) => acc + (d.actual_time || 0), 0);
        const diff_time = actual_time - expected_time;

        res.json({
          plan_id: planId,
          total_todos,
          completed_todos,
          delayed_todos,
          blocked_todos,
          expected_time,
          actual_time,
          diff_time
        });
      });
    });
  });
});

// 9. 전체 삭제 (Purge) - 내 계정 데이터만 삭제
app.delete('/api/backup/all', (req, res) => {
  db.serialize(() => {
    db.run(`DELETE FROM dos WHERE owner = ?`, [req.scope]);
    db.run(`DELETE FROM todos WHERE owner = ?`, [req.scope]);
    db.run(`DELETE FROM plans WHERE owner = ?`, [req.scope]);
    res.json({ success: true, message: '내 데이터 전체 삭제 완료' });
  });
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`백엔드 서버 실행 중: 포트 ${PORT}`);
});