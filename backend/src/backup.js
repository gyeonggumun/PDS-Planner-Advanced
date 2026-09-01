const express = require('express');
const multer = require('multer');
const db = require('./db');

const router = express.Router();
// 파일을 디스크에 저장하지 않고 메모리에서 바로 읽기 위한 설정
const upload = multer({ storage: multer.memoryStorage() });

// 비동기 처리를 위한 sqlite3 Promise 래퍼 함수
const runAsync = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function (err) {
    if (err) reject(err);
    else resolve(this);
  });
});
const allAsync = (query, params = []) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// 1. 내보내기 (Export) - T06-C34, C36
router.get('/export', async (req, res) => {
  const owner = req.userScope; // 미들웨어에서 강제된 A/B 범위
  try {
    const plans = await allAsync('SELECT * FROM plans WHERE owner = ?', [owner]);
    const todos = await allAsync('SELECT * FROM todos WHERE owner = ?', [owner]);
    const doRecords = await allAsync('SELECT * FROM do_records WHERE owner = ?', [owner]);
    
    // JSON 파일 다운로드 처리
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="backup_${owner}.json"`);
    res.json({ plans, todos, doRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. 전체 삭제 (Delete All) - T06-C37
router.delete('/all', async (req, res) => {
  const owner = req.userScope;
  try {
    await runAsync('BEGIN TRANSACTION');
    // 외래 키 제약 조건이 있을 수 있으므로 자식 테이블부터 삭제
    await runAsync('DELETE FROM do_records WHERE owner = ?', [owner]);
    await runAsync('DELETE FROM todos WHERE owner = ?', [owner]);
    await runAsync('DELETE FROM plans WHERE owner = ?', [owner]);
    await runAsync('COMMIT');
    
    res.json({ message: "해당 검토 범위의 모든 자료가 삭제되었습니다." });
  } catch (err) {
    await runAsync('ROLLBACK');
    res.status(500).json({ error: err.message });
  }
});

// 3. 가져오기 (Import) - T06-C38 ~ C44
router.post('/import', upload.single('file'), async (req, res) => {
  const owner = req.userScope;
  if (!req.file) return res.status(400).json({ error: "파일이 첨부되지 않았습니다." });

  let data;
  try {
    // T06-C41: 문법이 깨진 JSON 파일 거부
    data = JSON.parse(req.file.buffer.toString()); 
  } catch (err) {
    return res.status(400).json({ error: "JSON 문법이 깨진 잘못된 파일입니다." });
  }

  try {
    await runAsync('BEGIN TRANSACTION');

    // 날짜 유효성 검사 헬퍼 함수
    const validateDate = (dateStr) => !isNaN(Date.parse(dateStr));

    // Plans 복원
    if (data.plans) {
      for (const p of data.plans) {
        // T06-C42: 필수값 누락 검사
        if (!p.id || !p.title) throw new Error("필수값이 누락되었습니다.");
        
        // INSERT OR IGNORE를 통해 중복 ID 파일(T06-C43) 무시 및 중복 가져오기(T06-C39) 방어
        await runAsync(
          `INSERT OR IGNORE INTO plans (id, owner, title, period, priority, success_criteria, expected_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [p.id, owner, p.title, p.period, p.priority, p.success_criteria, p.expected_time]
        );
      }
    }

    // ToDos 복원
    if (data.todos) {
      for (const t of data.todos) {
        if (!t.id || !t.plan_id || !t.content) throw new Error("필수값이 누락되었습니다.");
        // T06-C44: 날짜 형식이 잘못된 파일 거부
        if (t.deadline && !validateDate(t.deadline)) throw new Error("잘못된 날짜 형식이 포함되어 있습니다.");
        
        await runAsync(
          `INSERT OR IGNORE INTO todos (id, plan_id, owner, content, status, deadline, priority, tags, expected_time) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.id, t.plan_id, owner, t.content, t.status, t.deadline, t.priority, t.tags, t.expected_time]
        );
      }
    }

    // Do Records 복원
    if (data.doRecords) {
      for (const d of data.doRecords) {
        if (!d.id || !d.todo_id) throw new Error("필수값이 누락되었습니다.");
        
        await runAsync(
          `INSERT OR IGNORE INTO do_records (id, todo_id, owner, start_time, end_time, actual_time, block_reason, idempotency_key) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [d.id, d.todo_id, owner, d.start_time, d.end_time, d.actual_time, d.block_reason, d.idempotency_key]
        );
      }
    }

    await runAsync('COMMIT');
    res.json({ message: "데이터 복원이 완료되었습니다." });

  } catch (err) {
    // T06-C41~C44: 오류 발생 시 롤백하여 기존 데이터 불변 유지
    await runAsync('ROLLBACK');
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;