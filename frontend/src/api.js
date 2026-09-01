const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000/api';

export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('pds_token');
  
  const headers = {
    ...options.headers,
  };

  // 로그인 토큰이 있으면 인증 헤더에 추가
  if (token) {
    headers['Authorization'] = token;
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  // [수정된 부분] 로그인 요청('/login') 중 발생한 401 에러는 새로고침을 예외 처리합니다.
  if (response.status === 401 && !endpoint.includes('/login')) {
    localStorage.removeItem('pds_token');
    localStorage.removeItem('pds_username');
    window.location.reload();
    throw new Error("인증이 필요하거나 만료되었습니다.");
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `API 요청 실패: ${response.status}`);
  }

  if (options.isDownload) {
    return response.blob();
  }

  return response.json();
};