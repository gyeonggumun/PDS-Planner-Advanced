import React, { useState, useEffect } from 'react';
import { fetchApi } from '../api';

export default function SeeDashboard({ currentPlanId, onNextPlanCreated }) {
  const [stats, setStats] = useState(null);
  const [adjustment, setAdjustment] = useState('');
  const [nextPlanTitle, setNextPlanTitle] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchApi(`/plans/${currentPlanId}/see`);
        setStats(data);
      } catch (e) {
        console.error(e);
      }
    };
    if (currentPlanId) loadStats();
  }, [currentPlanId]);

  const handleCreateNextPlan = async (e) => {
    e.preventDefault();
    if (!nextPlanTitle || !adjustment) return alert('제목과 조정 내용을 입력하세요.');

    try {
      await fetchApi('/plans', {
        method: 'POST',
        body: JSON.stringify({
          title: nextPlanTitle,
          success_criteria: `[회고 반영] ${adjustment}`,
          period: '7일',
          expected_time: stats?.expected_time || 0,
        }),
      });
      alert('회고 내용이 반영된 신규 Plan이 생성되었습니다.');
      setAdjustment('');
      setNextPlanTitle('');
      if (onNextPlanCreated) onNextPlanCreated();
    } catch (e) {
      alert('생성 실패');
    }
  };

  if (!stats) return <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>지표 분석 로딩 중...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}>See: Performance & Analytics</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>계획 대비 실행 오차를 분석하고 다음 주기로 피드백을 전달합니다.</p>
        </div>
        <span style={{ fontSize: '0.75rem', backgroundColor: '#f8fafc', color: '#334155', padding: '4px 8px', borderRadius: '4px', fontWeight: '600', border: '1px solid #cbd5e1' }}>
          Target ID: {stats.plan_id.slice(0, 8)}
        </span>
      </div>

      {/* KPI 카드 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Total Tasks</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#0f172a' }}>{stats.total_todos} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#64748b' }}>건</span></div>
        </div>
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#dc2626', textTransform: 'uppercase', marginBottom: '6px' }}>Delayed</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#dc2626' }}>{stats.delayed_todos} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#64748b' }}>건</span></div>
        </div>
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#d97706', textTransform: 'uppercase', marginBottom: '6px' }}>Blocked</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#d97706' }}>{stats.blocked_todos} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#64748b' }}>건</span></div>
        </div>
        <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>Time Variance</div>
          <div style={{ fontSize: '1.25rem', fontWeight: '700', color: stats.diff_time > 0 ? '#dc2626' : '#16a34a' }}>
            {stats.diff_time > 0 ? `+${stats.diff_time}` : stats.diff_time} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#64748b' }}>분</span>
          </div>
        </div>
      </div>

      {/* 다음 Plan 수립 폼 */}
      <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0', marginTop: '8px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>Create Iteration Plan based on Insights</h4>
        <form onSubmit={handleCreateNextPlan} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input 
            value={nextPlanTitle} 
            onChange={e => setNextPlanTitle(e.target.value)} 
            placeholder="다음 계획 주기 제목 (예: 정보처리기사 실기 2주차)" 
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9kt', backgroundColor: '#ffffff', outline: 'none' }}
          />
          <textarea 
            value={adjustment} 
            onChange={e => setAdjustment(e.target.value)} 
            placeholder="회고 내용 및 다음 주기 반영 사항 작성..." 
            rows="3"
            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff', outline: 'none', resize: 'vertical' }}
          />
          <button type="submit" style={{ padding: '10px 16px', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '0.9rem', alignSelf: 'flex-end' }}>
            회고 반영 후 다음 Plan 생성
          </button>
        </form>
      </div>
    </div>
  );
}