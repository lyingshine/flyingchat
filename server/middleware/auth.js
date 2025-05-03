const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'flying-chat-secret-key';

// 生成JWT令牌
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// 验证JWT令牌
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// 身份验证中间件
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: '请先登录' });
  }
};

module.exports = {
  generateToken,
  verifyToken,
  authenticate
}; 