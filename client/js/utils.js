/**
 * 工具函数模块 - 提供通用功能
 */

/**
 * 显示提示消息
 * @param {string} message 消息内容
 * @param {string} type 消息类型(info, success, error)
 */
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  
  if (!toast) return;
  
  // 清除之前的类
  toast.className = 'toast';
  
  // 添加对应类型的类
  if (type) {
    toast.classList.add(type);
  }
  
  toast.textContent = message;
  toast.style.display = 'block';
  
  // 3秒后隐藏
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

/**
 * 根据用户ID生成随机颜色
 * @param {string} userId 用户ID
 * @returns {string} 颜色值
 */
function getRandomColorById(userId) {
  // 使用用户ID生成一致的随机颜色
  const colors = [
    '#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
    '#6610f2', '#fd7e14', '#e83e8c', '#6f42c1', '#20c997'
  ];
  
  // 使用用户ID的哈希值选择颜色
  const hashCode = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  
  return colors[Math.abs(hashCode) % colors.length];
}

/**
 * 格式化时间为相对时间
 * @param {number} timestamp 时间戳
 * @returns {string} 相对时间
 */
function formatRelativeTime(timestamp) {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diff = now - messageDate;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    
    // 如果是今年内的其他日期，显示月份和日期
    if (now.getFullYear() === messageDate.getFullYear()) {
      return `${messageDate.getMonth() + 1}月${messageDate.getDate()}日`;
    }
    
    // 跨年
    return `${messageDate.getFullYear()}/${messageDate.getMonth() + 1}/${messageDate.getDate()}`;
  }
  
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

/**
 * 格式化时间为具体时间
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间
 */
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的日期
 */
function formatDate(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  
  // 如果是今天
  if (now.toDateString() === date.toDateString()) {
    return '今天';
  }
  
  // 如果是昨天
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === date.toDateString()) {
    return '昨天';
  }
  
  // 如果是本周内
  const daysOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const dayDiff = Math.floor((now - date) / (24 * 60 * 60 * 1000));
  if (dayDiff < 7) {
    return daysOfWeek[date.getDay()];
  }
  
  // 其他日期
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 检查是否包含URL
 * @param {string} text 文本内容
 * @returns {boolean} 是否包含URL
 */
function containsUrl(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return urlRegex.test(text);
}

/**
 * 将文本中的URL转换为链接
 * @param {string} text 文本内容
 * @returns {string} 处理后的HTML
 */
function linkifyText(text) {
  if (!text) return '';
  
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, url => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

/**
 * 防抖函数
 * @param {Function} func 要执行的函数
 * @param {number} wait 等待时间(毫秒)
 * @returns {Function} 防抖处理后的函数
 */
function debounce(func, wait = 300) {
  let timeout;
  
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func 要执行的函数
 * @param {number} limit 限制时间(毫秒)
 * @returns {Function} 节流处理后的函数
 */
function throttle(func, limit = 300) {
  let inThrottle;
  
  return function(...args) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 获取当前用户信息
 * @returns {Object|null} 用户信息
 */
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('currentUser'));
  } catch (e) {
    console.error('获取当前用户信息失败:', e);
    return null;
  }
}

module.exports = {
  showToast,
  getRandomColorById,
  formatRelativeTime,
  formatTime,
  formatDate,
  containsUrl,
  linkifyText,
  debounce,
  throttle,
  getCurrentUser
}; 