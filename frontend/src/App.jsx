import React, { useState, useEffect } from 'react';
import PlanToDoManager from './components/PlanToDoManager';
import BackupManager from './components/BackupManager';
import SeeDashboard from './components/SeeDashboard';
import { fetchApi } from './api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('pds_token') || '');
  const [username, setUsername] = useState(localStorage.getItem('pds_username') || '');
  
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [formInput, setFormInput] = useState({ username: '', password: '' });
  const [authError, setAuthError] = useState('');
  
  const [currentPlanId, setCurrentPlanId] = useState(null);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegisterMode ? '/register' : '/login';

    try {
      const data = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(formInput)
      });

      if (isRegisterMode) {
        alert('회원가입이 완료되었습니다. 로그인해주세요.');
        setIsRegisterMode(false);
        setFormInput({ username: '', password: '' });
      } else {
        localStorage.setItem('pds_token', data.token);
        localStorage.setItem('pds_username', data.username);
        setToken(data.token);
        setUsername(data.username);
      }
    } catch (err) {
      setAuthError(err.message || '요청 처리에 실패했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pds_token');
    localStorage.removeItem('pds_username');
    setToken('');
    setUsername('');
    setCurrentPlanId(null);
    setFormInput({ username: '', password: '' });
    setAuthError('');
  };

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '32px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#0f172a',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '1.1rem',
              marginBottom: '12px'
            }}>
              P
            </div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#0f172a' }}>
              {isRegisterMode ? 'Create an Account' : 'Sign in to PDS Planner'}
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              {isRegisterMode ? '안전한 개인 플래너 계정을 생성합니다.' : '계정 인증을 통해 내 자료에 안전하게 접근하세요.'}
            </p>
          </div>

          {authError && (
            <div style={{
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              padding: '10px 14px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              border: '1px solid #fecaca'
            }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Username</label>
              <input 
                type="text"
                required
                placeholder="아이디 입력"
                value={formInput.username}
                onChange={e => setFormInput({...formInput, username: e.target.value})}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Password</label>
              <input 
                type="password"
                required
                minLength={isRegisterMode ? 8 : undefined}
                placeholder={isRegisterMode ? "비밀번호 (8자 이상)" : "비밀번호 입력"}
                value={formInput.password}
                onChange={e => setFormInput({...formInput, password: e.target.value})}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
              />
              {isRegisterMode && (
                <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  * 비밀번호는 최소 8자 이상이어야 합니다.
                </p>
              )}
            </div>

            <button type="submit" style={{
              width: '100%',
              padding: '10px 16px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              marginTop: '8px'
            }}>
              {isRegisterMode ? '회원가입 완료' : '로그인'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
            <button 
              type="button"
              onClick={() => { setIsRegisterMode(!isRegisterMode); setAuthError(''); setFormInput({username: '', password: ''}); }}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.85rem', cursor: 'pointer', fontWeight: '500' }}
            >
              {isRegisterMode ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          height: '64px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#0f172a',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.9rem'
            }}>
              P
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>PDS Enterprise Secure Planner</h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>
              👤 <strong style={{ color: '#0f172a' }}>{username}</strong>님 접속 중
            </span>
            <button 
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#dc2626',
                fontWeight: '500',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main style={{
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '32px 24px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        boxSizing: 'border-box'
      }}>
        <BackupManager scope={username} />
        
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
        }}>
          <PlanToDoManager 
            scope={username} 
            onSelectPlan={(id) => setCurrentPlanId(id)} 
          />
        </div>

        {currentPlanId && (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #cbd5e1',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
          }}>
            <SeeDashboard currentPlanId={currentPlanId} onNextPlanCreated={() => setCurrentPlanId(null)} />
          </div>
        )}
      </main>

      <footer style={{
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        padding: '20px 24px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.8rem'
      }}>
        PDS Secure System v3.0 • Bcrypt Password Hashing & User Isolation Active
      </footer>
    </div>
  );
}