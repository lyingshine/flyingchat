/**
 * UI渲染器 - 负责将数据渲染到界面
 */
const { getRandomColorById, formatRelativeTime } = require('./utils');
const { switchChat } = require('./services/chat-service');

// 动态导入函数，避免循环依赖问题
function getUserService() {
  return require('./services/user-service');
}

/**
 * 渲染聊天列表
 * @param {Array} chats 聊天列表数据
 */
function renderChatList(chats) {
  const chatList = document.getElementById('chatList');
  if (!chatList) return;
  
  // 获取isUserOnline函数
  const { isUserOnline } = getUserService();
  
  // 群聊始终在第一位
  let html = `
    <div class="user-item active" data-userid="all">
      <div class="user-avatar" style="background-color: #3498db">群</div>
      <div class="user-item-info">
        <div class="user-item-name">群聊</div>
        <div class="user-item-message">${chats.groupLastMessage || '暂无消息'}</div>
      </div>
      ${chats.groupUnread ? `<div class="unread-badge">${chats.groupUnread}</div>` : ''}
    </div>
  `;
  
  // 渲染私聊列表
  if (chats.privateChats && chats.privateChats.length > 0) {
    chats.privateChats.forEach(chat => {
      const isOnline = isUserOnline(chat.userId);
      
      html += `
        <div class="user-item" data-userid="${chat.userId}">
          <div class="user-avatar" style="background-color: ${getRandomColorById(chat.userId)}">${chat.username.charAt(0).toUpperCase()}</div>
          <div class="user-item-info">
            <div class="user-item-name">${chat.username} ${isOnline ? '<span class="online-dot"></span>' : ''}</div>
            <div class="user-item-message">${chat.lastMessage || '暂无消息'}</div>
          </div>
          ${chat.lastMessageTime ? `<div class="time-stamp">${formatRelativeTime(chat.lastMessageTime)}</div>` : ''}
          ${chat.unread ? `<div class="unread-badge">${chat.unread}</div>` : ''}
        </div>
      `;
    });
  }
  
  chatList.innerHTML = html;
  
  // 添加点击事件
  const chatItems = chatList.querySelectorAll('.user-item');
  chatItems.forEach(item => {
    item.addEventListener('click', function() {
      const userId = this.dataset.userid;
      const name = this.querySelector('.user-item-name').textContent.trim();
      
      switchChat(userId, name);
    });
  });
}

/**
 * 渲染好友列表
 */
function renderFriendList() {
  const friendList = document.getElementById('friendList');
  if (!friendList) return;
  
  const friends = getUserService().getFriendList();
  
  if (!friends || friends.length === 0) {
    friendList.innerHTML = '<div class="empty-list">暂无好友</div>';
    return;
  }
  
  let html = '';
  
  friends.forEach(friend => {
    const isOnline = isUserOnline(friend.id);
    
    html += `
      <div class="user-item" data-userid="${friend.id}">
        <div class="user-avatar" style="background-color: ${getRandomColorById(friend.id)}">${friend.username.charAt(0).toUpperCase()}</div>
        <div class="user-item-info">
          <div class="user-item-name">${friend.username}</div>
        </div>
        <div class="user-status ${isOnline ? 'online' : 'offline'}"></div>
      </div>
    `;
  });
  
  friendList.innerHTML = html;
  
  // 添加点击事件
  const friendItems = friendList.querySelectorAll('.user-item');
  friendItems.forEach(item => {
    item.addEventListener('click', function() {
      const userId = this.dataset.userid;
      const name = this.querySelector('.user-item-name').textContent.trim();
      
      switchChat(userId, name);
    });
  });
}

/**
 * 渲染好友请求列表
 */
function renderFriendRequests() {
  const requestsContainer = document.getElementById('friendRequests');
  if (!requestsContainer) return;
  
  const requests = getUserService().getPendingRequests();
  
  if (!requests || requests.length === 0) {
    requestsContainer.innerHTML = '<div class="empty-list">暂无好友请求</div>';
    return;
  }
  
  let html = '';
  
  requests.forEach(request => {
    html += `
      <div class="request-item" data-requestid="${request.id}">
        <div class="request-info">
          <div class="request-avatar" style="background-color: ${getRandomColorById(request.sender.id)}">${request.sender.username.charAt(0).toUpperCase()}</div>
          <div class="request-name">${request.sender.username}</div>
        </div>
        <div class="request-actions">
          <button class="accept-button" data-requestid="${request.id}">接受</button>
          <button class="reject-button" data-requestid="${request.id}">拒绝</button>
        </div>
      </div>
    `;
  });
  
  requestsContainer.innerHTML = html;
  
  // 添加事件监听
  const acceptButtons = requestsContainer.querySelectorAll('.accept-button');
  const rejectButtons = requestsContainer.querySelectorAll('.reject-button');
  
  acceptButtons.forEach(button => {
    button.addEventListener('click', function() {
      const requestId = this.dataset.requestid;
      getUserService().respondToFriendRequest(requestId, true);
    });
  });
  
  rejectButtons.forEach(button => {
    button.addEventListener('click', function() {
      const requestId = this.dataset.requestid;
      getUserService().respondToFriendRequest(requestId, false);
    });
  });
}

/**
 * 渲染用户搜索结果
 * @param {Array} users 用户列表数据
 */
function renderSearchResults(users) {
  const searchResults = document.getElementById('searchResults');
  if (!searchResults) return;
  
  if (!users || users.length === 0) {
    searchResults.innerHTML = '<div class="empty-list">未找到用户</div>';
    return;
  }
  
  let html = '';
  
  users.forEach(user => {
    html += `
      <div class="search-item">
        <div class="search-item-avatar" style="background-color: ${getRandomColorById(user.id)}">${user.username.charAt(0).toUpperCase()}</div>
        <div class="search-item-info">
          <div class="search-item-name">${user.username}</div>
        </div>
        <button class="search-item-button ${user.isFriend ? 'disabled' : ''}" data-userid="${user.id}" ${user.isFriend ? 'disabled' : ''}>
          ${user.isFriend ? '已是好友' : user.requestSent ? '请求已发送' : '添加好友'}
        </button>
      </div>
    `;
  });
  
  searchResults.innerHTML = html;
  
  // 添加事件监听
  const addButtons = searchResults.querySelectorAll('.search-item-button:not(.disabled)');
  addButtons.forEach(button => {
    if (!button.disabled) {
      button.addEventListener('click', function() {
        const userId = this.dataset.userid;
        getUserService().sendFriendRequest(userId);
        
        // 禁用按钮并更改文本
        this.disabled = true;
        this.textContent = '请求已发送';
        this.classList.add('disabled');
      });
    }
  });
}

/**
 * 更新用户在线状态
 * @param {string} userId 用户ID
 */
function updateUserOnlineStatus(userId) {
  const { isUserOnline } = getUserService();
  const isOnline = isUserOnline(userId);
  
  // 更新聊天名称旁的在线状态
  if (require('./services/chat-service').getActiveChat() === userId) {
    const statusDot = document.querySelector('#chatHeader .status-dot');
    if (statusDot) {
      statusDot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
    }
  }
}

/**
 * 更新好友列表在线状态
 */
function updateFriendListOnlineStatus() {
  const { isUserOnline } = getUserService();
  const friendItems = document.querySelectorAll('#friendList .user-item');
  
  friendItems.forEach(item => {
    const userId = item.dataset.userid;
    const statusDot = item.querySelector('.user-status');
    
    if (statusDot) {
      statusDot.className = `user-status ${isUserOnline(userId) ? 'online' : 'offline'}`;
    }
  });
}

/**
 * 显示注册面板
 */
function showRegisterPanel() {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  
  if (loginPanel && registerPanel) {
    loginPanel.style.display = 'none';
    registerPanel.style.display = 'flex';
  }
}

module.exports = {
  renderChatList,
  renderFriendList,
  renderFriendRequests,
  renderSearchResults,
  updateUserOnlineStatus,
  updateFriendListOnlineStatus,
  showRegisterPanel
}; 