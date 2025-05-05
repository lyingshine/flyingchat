/**
 * 消息渲染器 - 负责渲染聊天消息到界面
 */
const { formatTime, formatDate, getRandomColorById } = require('./utils');

/**
 * 添加消息到界面
 * @param {Object} message 消息对象
 * @param {boolean} prepend 是否添加到顶部
 * @param {boolean} addTimeDivider 是否添加时间分割线
 */
function addMessage(message, prepend = false, addTimeDivider = true) {
  // 创建消息元素
  const messageEl = createMessageElement(message);
  
  // 获取消息容器
  const chatMessages = document.getElementById('chatMessages');
  
  if (!chatMessages) return;
  
  // 添加时间分割线
  if (addTimeDivider) {
    addDateDividerIfNeeded(message.timestamp);
  }
  
  // 添加消息到界面
  if (prepend) {
    chatMessages.insertBefore(messageEl, chatMessages.firstChild);
  } else {
    chatMessages.appendChild(messageEl);
    scrollToBottom();
  }
}

/**
 * 创建消息元素
 * @param {Object} message 消息对象
 * @returns {HTMLElement} 消息元素
 */
function createMessageElement(message) {
  const { id, sender, content, timestamp, type } = message;
  
  // 创建消息元素
  const messageEl = document.createElement('div');
  messageEl.className = 'message';
  messageEl.dataset.id = id;
  messageEl.dataset.timestamp = timestamp;
  
  // 判断是否是自己发送的消息
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  const isSelf = currentUser && sender.id === currentUser.id;
  
  if (isSelf) {
    messageEl.classList.add('self');
  }
  
  // 创建头像
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.style.backgroundColor = getRandomColorById(sender.id);
  avatar.textContent = sender.username.charAt(0).toUpperCase();
  
  // 创建消息内容容器
  const messageContent = document.createElement('div');
  messageContent.className = 'message-content';
  
  // 创建发送者名称
  if (!isSelf && getActiveChat() === 'all') {
    const authorEl = document.createElement('div');
    authorEl.className = 'message-author';
    authorEl.textContent = sender.username;
    messageContent.appendChild(authorEl);
  }
  
  // 创建消息气泡
  const messageBubble = document.createElement('div');
  messageBubble.className = 'message-bubble';
  
  // 根据消息类型渲染内容
  if (type === 'text') {
    messageBubble.textContent = content;
  } else if (type === 'image') {
    const img = document.createElement('img');
    img.src = content;
    img.alt = '图片消息';
    img.onload = () => scrollToBottom();
    
    // 图片点击预览
    img.addEventListener('click', () => {
      showImagePreview(content);
    });
    
    messageBubble.appendChild(img);
  }
  
  // 创建时间
  const timeEl = document.createElement('div');
  timeEl.className = 'message-time';
  timeEl.textContent = formatTime(timestamp);
  
  // 组装消息
  messageContent.appendChild(messageBubble);
  messageContent.appendChild(timeEl);
  
  messageEl.appendChild(avatar);
  messageEl.appendChild(messageContent);
  
  return messageEl;
}

/**
 * 添加日期分割线
 * @param {number} timestamp 时间戳
 */
function addDateDividerIfNeeded(timestamp) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;
  
  const date = formatDate(timestamp);
  const lastDivider = chatMessages.querySelector(`.date-divider[data-date="${date}"]`);
  
  // 如果已经有相同日期的分割线，不添加
  if (lastDivider) return;
  
  const divider = document.createElement('div');
  divider.className = 'date-divider';
  divider.dataset.date = date;
  divider.textContent = date;
  
  // 添加到消息容器
  chatMessages.appendChild(divider);
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

/**
 * 显示图片预览
 * @param {string} imageUrl 图片URL
 */
function showImagePreview(imageUrl) {
  // 创建图片预览模态框
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="image-preview-container">
      <div class="close-button">&times;</div>
      <img src="${imageUrl}" alt="图片预览">
    </div>
  `;
  
  // 添加到body
  document.body.appendChild(modal);
  
  // 关闭预览
  modal.addEventListener('click', function(e) {
    if (e.target === modal || e.target.classList.contains('close-button')) {
      document.body.removeChild(modal);
    }
  });
}

/**
 * 获取当前活跃的聊天ID
 * 这是一个辅助函数，实际实现会在chat-service中
 */
function getActiveChat() {
  // 从chat-service中导入
  return require('./services/chat-service').getActiveChat();
}

module.exports = {
  addMessage,
  createMessageElement,
  addDateDividerIfNeeded,
  scrollToBottom,
  showImagePreview
}; 