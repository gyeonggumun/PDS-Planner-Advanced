const requireScope = (req, res, next) => {
  const scope = req.headers['x-scope-id'];
  if (!scope || (scope !== 'A' && scope !== 'B')) {
    return res.status(403).json({ error: "유효한 검토 범위(A/B)가 필요합니다." });
  }
  // 이후 모든 요청에서 이 값을 강제로 사용하여 DB 격리
  req.userScope = scope; 
  next();
};

module.exports = { requireScope };