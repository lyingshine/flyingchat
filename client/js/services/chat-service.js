/**
 * 聊天服务 - 处理消息发送和接收等功能
 */
const { ipcRenderer } = require('electron');
const messageRenderer = require('../message-renderer');

/**
 * 当前活跃的聊天ID
 */
let activeChat = 'all'; // 默认为群聊

/**
 * 当前聊天消息的分页
 */
let currentPage = 1;

/**
 * 是否有更多消息
 */
let hasMoreMessages = false;

/**
 * 设置当前聊天
 * @param {string} chatId 聊天ID
 */
function setActiveChat(chatId) {
  activeChat = chatId;
}

/**
 * 获取当前活跃的聊天ID
 * @returns {string} 当前活跃聊天ID
 */
function getActiveChat() {
  return activeChat;
}

/**
 * 切换到群聊
 */
function switchToGroupChat() {
  switchChat('all', '群聊');
}

/**
 * 切换聊天
 * @param {string} userId 用户ID
 * @param {string} name 聊天名称
 */
function switchChat(userId, name) {
  // 更新UI
  const chatItems = document.querySelectorAll('.user-item');
  chatItems.forEach(item => {
    item.classList.remove('active');
    if (item.dataset.userid === userId) {
      item.classList.add('active');
    }
  });
  
  // 更新聊天名称
  const chatName = document.getElementById('chatName');
  if (chatName) {
    chatName.textContent = name;
  }
  
  // 清空聊天消息区域
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.innerHTML = '';
  }
  
  // 重置分页
  currentPage = 1;
  
  // 设置当前聊天
  setActiveChat(userId);
  
  // 加载消息
  loadMessages(userId, currentPage);
}

/**
 * 加载更多消息
 */
function loadMoreMessages() {
  if (hasMoreMessages) {
    currentPage++;
    loadMessages(getActiveChat(), currentPage, true);
  }
}

/**
 * 加载消息
 * @param {string} chatId 聊天ID
 * @param {number} page 页码
 * @param {boolean} prepend 是否添加到顶部
 */
function loadMessages(chatId, page, prepend = false) {
  // 显示加载状态
  const loadMoreButton = document.getElementById('loadMoreMessages');
  if (loadMoreButton) {
    loadMoreButton.textContent = '加载中...';
    loadMoreButton.disabled = true;
  }
  
  // 请求消息
  ipcRenderer.send('load-messages', {
    chatId,
    page,
    limit: 20
  });
}

/**
 * 发送消息
 * @param {string} content 消息内容
 * @param {string} type 消息类型
 */
function sendMessage(content, type = 'text') {
  if (!content.trim()) return;
  
  const message = {
    to: activeChat,
    content,
    type
  };
  
  // 发送消息
  ipcRenderer.send('send-message', message);
  
  // 清空输入框
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.value = '';
    messageInput.focus();
  }
}

// 消息加载响应处理
ipcRenderer.on('messages-loaded', (event, response) => {
  const { messages, hasMore } = response;
  
  // 更新是否有更多消息的标志
  hasMoreMessages = hasMore;
  
  // 显示或隐藏加载更多按钮
  const loadMoreButton = document.getElementById('loadMoreMessages');
  if (loadMoreButton) {
    loadMoreButton.style.display = hasMore ? 'block' : 'none';
    loadMoreButton.textContent = '加载更多';
    loadMoreButton.disabled = false;
  }
  
  // 更新消息列表
  if (messages && messages.length > 0) {
    let lastMessageTimestamp = null;
    
    messages.forEach((message, index) => {
      const isPrepend = currentPage > 1;
      const addTimeDivider = index === 0 || !lastMessageTimestamp || 
        !isSameDay(message.timestamp, lastMessageTimestamp);
      
      messageRenderer.addMessage(message, isPrepend, addTimeDivider);
      
      lastMessageTimestamp = message.timestamp;
    });
  } else {
    // 如果没有消息，显示提示
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages && chatMessages.children.length === 0) {
      const emptyMessage = document.createElement('div');
      emptyMessage.className = 'empty-chat';
      emptyMessage.textContent = '暂无消息';
      chatMessages.appendChild(emptyMessage);
    }
  }
});

// 新消息处理
ipcRenderer.on('new-message', (event, message) => {
  const { to, sender } = message;
  
  // 如果是当前聊天的消息，直接添加到聊天区域
  if ((to === 'all' && activeChat === 'all') || 
      (to !== 'all' && (sender.id === activeChat || to === activeChat))) {
    messageRenderer.addMessage(message);
  }
  
  // 更新聊天列表中的最新消息
  updateChatListItem(message);
});

/**
 * 更新聊天列表项
 * @param {Object} message 消息对象
 */
function updateChatListItem(message) {
  // 聊天ID可能是用户ID或群组ID(all)
  const chatId = message.to === 'all' ? 'all' : 
    (message.to === getCurrentUserId() ? message.sender.id : message.to);
  
  // 获取聊天项
  const chatItem = document.querySelector(`.user-item[data-userid="${chatId}"]`);
  
  if (chatItem) {
    // 更新最后一条消息
    const messagePreview = chatItem.querySelector('.user-item-message');
    if (messagePreview) {
      messagePreview.textContent = message.type === 'text' ? 
        (message.content.length > 20 ? message.content.substring(0, 20) + '...' : message.content) : 
        '[图片消息]';
    }
    
    // 更新时间
    const timeStamp = chatItem.querySelector('.time-stamp');
    if (timeStamp) {
      timeStamp.textContent = formatRelativeTime(message.timestamp);
    }
    
    // 如果不是当前聊天，更新未读消息数
    if (activeChat !== chatId) {
      const unreadBadge = chatItem.querySelector('.unread-badge');
      
      if (unreadBadge) {
        const currentCount = parseInt(unreadBadge.textContent) || 0;
        unreadBadge.textContent = currentCount + 1;
        unreadBadge.style.display = 'flex';
      } else {
        // 创建未读徽章
        const badge = document.createElement('div');
        badge.className = 'unread-badge';
        badge.textContent = '1';
        chatItem.appendChild(badge);
      }
    }
  }
}

/**
 * 获取当前用户ID
 * @returns {string} 用户ID
 */
function getCurrentUserId() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  return currentUser ? currentUser.id : null;
}

/**
 * 检查两个时间戳是否是同一天
 * @param {number} timestamp1 时间戳1
 * @param {number} timestamp2 时间戳2
 * @returns {boolean} 是否是同一天
 */
function isSameDay(timestamp1, timestamp2) {
  const date1 = new Date(timestamp1);
  const date2 = new Date(timestamp2);
  
  return date1.getDate() === date2.getDate() && 
         date1.getMonth() === date2.getMonth() && 
         date1.getFullYear() === date2.getFullYear();
}

// 从utils.js导入格式化时间的方法
const { formatRelativeTime } = require('../utils');

module.exports = {
  getActiveChat,
  setActiveChat,
  switchToGroupChat,
  switchChat,
  loadMoreMessages,
  loadMessages,
  sendMessage
}; 