import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api';

export default function PlanToDoManager({ scope, onSelectPlan }) {
  const [plans, setPlans] = useState([]);
  const [todos, setTodos] = useState([]);
  
  // 오늘 날짜와 일주일 뒤 날짜를 기본값으로 설정
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const [planForm, setPlanForm] = useState({
    title: '',
    startDate: todayStr,
    endDate: nextWeekStr,
  });
  const [todoContents, setTodoContents] = useState({});

  useEffect(() => {
    loadData();
  }, [scope]);

  const loadData = async () => {
    try {
      const pData = await fetchApi('/plans');
      const tData = await fetchApi('/todos');
      setPlans(pData || []);
      setTodos(tData || []);
    } catch (e) {
      console.error('데이터 로드 실패:', e);
    }
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planForm.title.trim()) return alert('계획 제목을 입력해주세요.');
    if (!planForm.startDate || !planForm.endDate) return alert('시작일과 종료일을 모두 선택해주세요.');
    
    if (planForm.startDate > planForm.endDate) {
      return alert('종료일은 시작일보다 빠를 수 없습니다.');
    }

    // 선택한 달력 날짜들을 조합하여 period 문자열 생성 (예: "2026-06-01 ~ 2026-06-07")
    const formattedPeriod = `${planForm.startDate} ~ ${planForm.endDate}`;

    await fetchApi('/plans', {
      method: 'POST',
      body: JSON.stringify({ 
        id: crypto.randomUUID(), 
        title: planForm.title, 
        period: formattedPeriod, 
        success_criteria: '달력 기반 일정 관리 완료',
        expected_time: 1200 
      })
    });

    setPlanForm({ title: '', startDate: todayStr, endDate: nextWeekStr });
    loadData();
  };

  const handleCreateTodo = async (planId, e) => {
    e.preventDefault();
    const content = todoContents[planId];
    if (!content || !content.trim()) return;

    await fetchApi('/todos', {
      method: 'POST',
      body: JSON.stringify({
        id: crypto.randomUUID(),
        plan_id: planId,
        content: content,
        status: 'pending',
        expected_time: 60,
        deadline: new Date(Date.now() + 86400000).toISOString()
      })
    });
    
    setTodoContents({ ...todoContents, [planId]: '' });
    loadData();
  };

  const handleCompleteTodo = async (todoId) => {
    setTodos(todos.map(t => t.id === todoId ? { ...t, isCompleting: true } : t));
    try {
      await fetchApi(`/todos/${todoId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          actual_time: 60,
          block_reason: ''
        })
      });
      loadData();
    } catch (e) {
      alert('완료 처리 실패');
      loadData();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 섹션 타이틀 영역 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600', color: '#0f172a' }}>Plan & Execution Board</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>달력으로 일정 기간을 지정하여 목표와 세부 과제를 관리합니다.</p>
        </div>
        <span style={{ fontSize: '0.8rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontWeight: '500', border: '1px solid #e2e8f0' }}>
          Active Scope: {scope}
        </span>
      </div>

      {/* 새 계획 등록 폼 카드 (달력 날짜 선택 적용) */}
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: '600', color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Create New Plan (Calendar)</h3>
        <form onSubmit={handleCreatePlan} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input 
            placeholder="목표 제목 입력 (예: 정보처리기사 실기 대비)" 
            value={planForm.title} 
            onChange={e => setPlanForm({...planForm, title: e.target.value})} 
            style={{ flex: 2, minWidth: '220px', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff', outline: 'none' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569' }}>
            <span>시작:</span>
            <input 
              type="date"
              value={planForm.startDate}
              onChange={e => setPlanForm({...planForm, startDate: e.target.value})}
              style={{ padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#475569' }}>
            <span>종료:</span>
            <input 
              type="date"
              value={planForm.endDate}
              onChange={e => setPlanForm({...planForm, endDate: e.target.value})}
              style={{ padding: '9px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontSize: '0.85rem', outline: 'none' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}>
            계획 생성
          </button>
        </form>
      </div>

      {/* 계획 및 ToDo 리스트 컨테이너 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {plans.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.9rem' }}>
            등록된 계획이 없습니다. 상단 달력 입력창을 통해 첫 번째 계획을 생성하세요.
          </div>
        )}
        
        {plans.map(plan => {
          const planTodos = todos.filter(t => t.plan_id === plan.id);
          const completedCount = planTodos.filter(t => t.status === 'completed').length;
          const progress = planTodos.length > 0 ? Math.round((completedCount / planTodos.length) * 100) : 0;

          return (
            <div key={plan.id} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.75rem', backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: '4px', fontWeight: '600', border: '1px solid #bfdbfe' }}>
                      기간: {plan.period}
                    </span>
                  </div>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '600', color: '#0f172a' }}>{plan.title}</h4>
                </div>
                <button 
                  onClick={() => onSelectPlan(plan.id)} 
                  style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  회고(See) 분석 리포트
                </button>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
                  <span>진행 현황 ({completedCount} / {planTodos.length} 완료)</span>
                  <span>{progress}%</span>
                </div>
                <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#0f172a', transition: 'width 0.3s ease' }}></div>
                </div>
              </div>

              <form onSubmit={(e) => handleCreateTodo(plan.id, e)} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  placeholder="세부 과제(ToDo) 추가..." 
                  value={todoContents[plan.id] || ''} 
                  onChange={e => setTodoContents({...todoContents, [plan.id]: e.target.value})}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }}
                />
                <button type="submit" style={{ padding: '8px 14px', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }}>
                  추가
                </button>
              </form>

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {planTodos.map(todo => {
                  const isDone = todo.status === 'completed';
                  return (
                    <li key={todo.id} style={{ backgroundColor: isDone ? '#f8fafc' : '#ffffff', border: '1px solid #f1f5f9', padding: '10px 12px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isDone ? 0.75 : 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '0.85rem', color: isDone ? '#16a34a' : '#94a3b8', fontWeight: 'bold' }}>
                          {isDone ? '✓' : '•'}
                        </span>
                        <span style={{ textDecoration: isDone ? 'line-through' : 'none', color: isDone ? '#64748b' : '#0f172a', fontSize: '0.9rem', fontWeight: isDone ? '400' : '500' }}>
                          {todo.content}
                        </span>
                      </div>
                      {!isDone && (
                        <button 
                          onClick={() => handleCompleteTodo(todo.id)} 
                          disabled={todo.isCompleting}
                          style={{ backgroundColor: '#0f172a', color: '#ffffff', border: 'none', padding: '5px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '500', cursor: 'pointer' }}
                        >
                          {todo.isCompleting ? '처리중' : '완료'}
                        </button>
                      )}
                    </li>
                  );
                })}
                {planTodos.length === 0 && (
                  <li style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '8px 0', textAlign: 'center' }}>
                    등록된 세부 과제가 없습니다.
                  </li>
                )}
              </ul>

            </div>
          );
        })}
      </div>
    </div>
  );
}