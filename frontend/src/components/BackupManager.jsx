import React, { useRef } from 'react';
import { fetchApi } from '../api';

export default function BackupManager({ scope }) {
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      const blob = await fetchApi('/backup/export', { isDownload: true });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_scope_${scope}.json`;
      a.click();
    } catch (e) { console.error(e); }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`[보안 경고] 인물 ${scope}의 모든 데이터가 영구 삭제됩니다. 진행하시겠습니까?`)) return;
    await fetchApi('/backup/all', { method: 'DELETE' });
    window.location.reload();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    try {
      await fetchApi('/backup/import', { method: 'POST', body: formData });
      alert('데이터 복원이 완료되었습니다.');
      window.location.reload();
    } catch (err) {
      alert('가져오기 실패: 파일 스키마가 올바르지 않습니다.');
    } finally {
      fileInputRef.current.value = '';
    }
  };

  // [추가] 샘플 데이터 주입 핸들러
  const handleSeedData = async () => {
    try {
      await fetchApi('/debug/seed', { method: 'POST' });
      alert('테스트용 샘플 데이터가 성공적으로 생성되었습니다!');
      window.location.reload();
    } catch (e) {
      alert('샘플 데이터 생성 실패');
    }
  };

  return (
    <div style={{ backgroundColor: '#ffffff', padding: '16px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }}>
      <div>
        <h3 style={{ margin: '0 0 2px 0', fontSize: '0.95rem', fontWeight: '600', color: '#0f172a' }}>System Storage & Backup</h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Current Isolated Workspace: <strong style={{ color: '#0f172a' }}>{scope}</strong></p>
      </div>
      
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* 샘플 데이터 주입 버튼 추가 */}
        <button onClick={handleSeedData} style={{ padding: '8px 12px', backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}>
          ⚡ 샘플 데이터 채우기
        </button>

        <button onClick={handleExport} style={{ padding: '8px 12px', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer' }}>
          Export JSON
        </button>
        
        <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
        <button onClick={() => fileInputRef.current.click()} style={{ padding: '8px 12px', backgroundColor: '#ffffff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer' }}>
          Import JSON
        </button>
        
        <button onClick={handleDeleteAll} style={{ padding: '8px 12px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '500', cursor: 'pointer' }}>
          Purge Data
        </button>
      </div>
    </div>
  );
}