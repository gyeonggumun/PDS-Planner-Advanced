const express = require('express');
const router = express.Router();
const db = require('./db');

// 비동기 쿼리 처리를 위한 래퍼 함수
const getAsync = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

// 특정 Plan의 See 집계 결과 반환 API
router.get('/plans/:plan_id/see', async (req, res) => {
  const planId = req.params.plan_id;
  const owner = req.userScope; // 미들웨어에서 강제 주입된 A/B 범위
  
  // T06-C30: KST(Asia/Seoul) 검토 기준일 처리 
  // 배포 서버가 UTC를 쓰더라도 무조건 한국 시간 기준으로 오늘 날짜를 구함
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + kstOffset);
  const todayKST = kstDate.toISOString().split('T')[0]; // "YYYY-MM-DD" 형식

  try {
    // 1. 계획 수 (T06-C28: 삭제되지 않은 서로 다른 ToDo 수) 및 예상 시간 합계 (T06-C32)
    const baseStats = await getAsync(`
      SELECT 
        COUNT(id) as total_todos,
        COALESCE(SUM(expected_time), 0) as total_expected_time
      FROM todos 
      WHERE plan_id = ? AND owner = ?
    `, [planId, owner]);

    // 2. 완료 수 (T06-C29: 현재 완료 상태인 서로 다른 ToDo 수)
    const completedStats = await getAsync(`
      SELECT COUNT(id) as completed_todos
      FROM todos
      WHERE plan_id = ? AND owner = ? AND status = 'completed'
    `, [planId, owner]);

    // 3. 지연 수 (T06-C30: 완료되지 않았고 마감일이 KST 기준일보다 앞선 ToDo 수)
    // 완료한 ToDo는 지연으로 중복 계산하지 않음[cite: 1]
    const delayedStats = await getAsync(`
      SELECT COUNT(id) as delayed_todos
      FROM todos
      WHERE plan_id = ? AND owner = ? 
        AND status != 'completed' 
        AND deadline < ?
    `, [planId, owner, todayKST]);

    // 4. 막힘 수 (T06-C31: 연결된 Do 기록에 공백이 아닌 막힌 이유가 하나 이상 있는 서로 다른 ToDo 수)
    // COUNT(DISTINCT)를 사용해 동일 ToDo에서 여러 번 막혔더라도 1건으로 계산[cite: 1]
    const blockedStats = await getAsync(`
      SELECT COUNT(DISTINCT t.id) as blocked_todos
      FROM todos t
      JOIN do_records d ON t.id = d.todo_id
      WHERE t.plan_id = ? AND t.owner = ? 
        AND d.block_reason IS NOT NULL 
        AND trim(d.block_reason) != ''
    `, [planId, owner]);

    // 5. 실제 시간 합계 (T06-C32: Plan과 ToDo가 모두 맞는 Do 실제 시간 합계)
    const actualTimeStats = await getAsync(`
      SELECT COALESCE(SUM(d.actual_time), 0) as total_actual_time
      FROM do_records d
      JOIN todos t ON d.todo_id = t.id
      WHERE t.plan_id = ? AND t.owner = ?
    `, [planId, owner]);

    // 6. 차이 계산 (T06-C32: 실제 시간 - 예상 시간)
    const totalExpected = baseStats.total_expected_time;
    const totalActual = actualTimeStats.total_actual_time;
    const diffTime = totalActual - totalExpected;

    // 최종 집계 결과 반환
    res.json({
      plan_id: planId,
      total_todos: baseStats.total_todos,
      completed_todos: completedStats.completed_todos,
      delayed_todos: delayedStats.delayed_todos,
      blocked_todos: blockedStats.blocked_todos,
      expected_time: totalExpected,
      actual_time: totalActual,
      diff_time: diffTime
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;