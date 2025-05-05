/**
 * 用户服务 - 处理用户相关功能
 */
const { ipcRenderer } = require('electron');
const { renderFriendList, renderFriendRequests, renderSearchResults, updateUserOnlineStatus, updateFriendListOnlineStatus } = require('../ui-renderer');
const { showToast } = require('../utils');

/**
 * 在线用户列表
 */
let onlineUsers = [];

/**
 * 好友列表
 */
let friendList = [];

/**
 * 好友请求列表
 */
let pendingRequests = [];

/**
 * 设置在线用户列表
 * @param {Array} users 在线用户列表
 */
function setOnlineUsers(users) {
  onlineUsers = users || [];
}

/**
 * 获取在线用户列表
 * @returns {Array} 在线用户列表
 */
function getOnlineUsers() {
  return onlineUsers;
}

/**
 * 设置好友列表
 * @param {Array} friends 好友列表
 */
function setFriendList(friends) {
  friendList = friends || [];
}

/**
 * 获取好友列表
 * @returns {Array} 好友列表
 */
function getFriendList() {
  return friendList;
}

/**
 * 设置好友请求列表
 * @param {Array} requests 好友请求列表
 */
function setPendingRequests(requests) {
  pendingRequests = requests || [];
}

/**
 * 获取好友请求列表
 * @returns {Array} 好友请求列表
 */
function getPendingRequests() {
  return pendingRequests;
}

/**
 * 加载好友列表
 */
function loadFriendList() {
  ipcRenderer.send('get-friends');
}

/**
 * 加载好友请求
 */
function loadFriendRequests() {
  ipcRenderer.send('get-friend-requests');
}

/**
 * 搜索用户
 * @param {string} keyword 搜索关键词
 */
function searchUsers(keyword) {
  if (!keyword.trim()) return;
  
  ipcRenderer.send('search-users', {
    keyword
  });
}

/**
 * 发送好友请求
 * @param {string} userId 用户ID
 */
function sendFriendRequest(userId) {
  ipcRenderer.send('send-friend-request', {
    userId
  });
}

/**
 * 响应好友请求
 * @param {string} requestId 请求ID
 * @param {boolean} accept 是否接受
 */
function respondToFriendRequest(requestId, accept) {
  ipcRenderer.send('respond-to-friend-request', {
    requestId,
    accept
  });
}

/**
 * 更新好友请求徽章
 */
function updateRequestsBadge() {
  const requestsBadge = document.getElementById('requestsBadge');
  
  if (requestsBadge) {
    const count = pendingRequests.length;
    
    if (count > 0) {
      requestsBadge.textContent = count;
      requestsBadge.style.display = 'flex';
      
      // 确保请求选项卡保持默认颜色
      const requestTab = document.querySelector('.sidebar-tab[data-tab="requests"]');
      if (requestTab) {
        requestTab.style.color = 'var(--text-secondary)';
        requestTab.style.backgroundColor = 'transparent';
        requestTab.style.border = 'none';
      }
    } else {
      requestsBadge.style.display = 'none';
    }
  }
}

/**
 * 检查用户是否在线
 * @param {string} userId 用户ID
 * @returns {boolean} 是否在线
 */
function isUserOnline(userId) {
  return onlineUsers.some(user => user.id === userId);
}

// 在线用户更新处理
ipcRenderer.on('online-users-updated', (event, users) => {
  setOnlineUsers(users);
  
  // 引入 chat-service 获取活跃聊天
  // 避免循环依赖
  const { getActiveChat } = require('./chat-service');
  
  // 如果当前是私聊，更新在线状态
  const activeChat = getActiveChat();
  if (activeChat !== 'all') {
    updateUserOnlineStatus(activeChat);
  }
  
  // 更新好友列表在线状态
  updateFriendListOnlineStatus();
});

// 好友列表加载响应
ipcRenderer.on('friends-loaded', (event, friends) => {
  setFriendList(friends);
  renderFriendList();
});

// 好友请求加载响应
ipcRenderer.on('friend-requests-loaded', (event, requests) => {
  setPendingRequests(requests);
  renderFriendRequests();
  updateRequestsBadge();
});

// 用户搜索响应
ipcRenderer.on('users-search-result', (event, users) => {
  renderSearchResults(users);
});

// 好友请求响应
ipcRenderer.on('friend-request-response', (event, response) => {
  if (response.success) {
    showToast('好友请求已发送', 'success');
  } else {
    showToast(response.message || '发送好友请求失败', 'error');
  }
});

// 新好友请求通知
ipcRenderer.on('new-friend-request', (event, request) => {
  // 添加到好友请求列表
  pendingRequests.push(request);
  
  // 更新好友请求徽章
  updateRequestsBadge();
  
  // 确保请求选项卡保持默认颜色
  const requestTab = document.querySelector('.sidebar-tab[data-tab="requests"]');
  if (requestTab) {
    requestTab.style.color = 'var(--text-secondary)';
    requestTab.style.backgroundColor = 'transparent';
    requestTab.style.border = 'none';
  }
  
  // 如果在请求页面，更新渲染
  if (document.querySelector('.sidebar-tab[data-tab="requests"]').classList.contains('active')) {
    renderFriendRequests();
  }
  
  // 显示提示
  showToast(`收到来自 ${request.sender.username} 的好友请求`, 'info');
});

// 好友请求响应处理
ipcRenderer.on('friend-request-result', (event, response) => {
  if (response.success) {
    // 从待处理列表中移除
    setPendingRequests(pendingRequests.filter(req => req.id !== response.requestId));
    
    // 更新徽章
    updateRequestsBadge();
    
    // 更新渲染
    renderFriendRequests();
    
    // 如果接受，更新好友列表
    if (response.accept) {
      loadFriendList();
      showToast('已添加好友', 'success');
    } else {
      showToast('已拒绝好友请求', 'info');
    }
  } else {
    showToast(response.message || '处理好友请求失败', 'error');
  }
});

module.exports = {
  loadFriendList,
  loadFriendRequests,
  searchUsers,
  sendFriendRequest,
  respondToFriendRequest,
  isUserOnline,
  getOnlineUsers,
  getFriendList,
  getPendingRequests
}; 