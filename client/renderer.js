/**
 * 渲染进程脚本 - 处理UI交互
 */

const { ipcRenderer } = require('electron');

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  // 显示应用界面
  document.getElementById('loading').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  
  // 获取DOM元素
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  const chatPanel = document.getElementById('chatPanel');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const registerUsernameInput = document.getElementById('registerUsernameInput');
  const registerPasswordInput = document.getElementById('registerPasswordInput');
  const registerPasswordConfirmInput = document.getElementById('registerPasswordConfirmInput');
  const loginButton = document.getElementById('loginButton');
  const registerButton = document.getElementById('registerButton');
  const switchToRegisterButton = document.getElementById('switchToRegister');
  const switchToLoginButton = document.getElementById('switchToLogin');
  const currentUserAvatar = document.getElementById('currentUserAvatar');
  const currentUsername = document.getElementById('currentUsername');
  const logoutButton = document.getElementById('logoutButton');
  const chatList = document.getElementById('chatList');
  const friendList = document.getElementById('friendList');
  const friendRequests = document.getElementById('friendRequests');
  const chatName = document.getElementById('chatName');
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  const loadMoreButton = document.getElementById('loadMoreMessages');
  const addFriendButton = document.getElementById('addFriendButton');
  const addFriendModal = document.getElementById('addFriendModal');
  const closeAddFriendModal = document.getElementById('closeAddFriendModal');
  const searchUserInput = document.getElementById('searchUserInput');
  const searchUserButton = document.getElementById('searchUserButton');
  const searchResults = document.getElementById('searchResults');
  const requestsBadge = document.getElementById('requestsBadge');
  const emojiButton = document.getElementById('emojiButton');
  const uploadButton = document.getElementById('uploadButton');
  const refreshChatButton = document.getElementById('refreshChatButton');
  const clearChatButton = document.getElementById('clearChatButton');
  
  // 侧边栏选项卡元素
  const sidebarTabs = document.querySelectorAll('.sidebar-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 用户数据
  let currentUser = {
    id: '',
    username: '',
    token: ''
  };
  let activeChat = 'all'; // 默认为群聊
  let currentPage = 1;
  let hasMoreMessages = false;
  let pendingRequests = []; // 待处理的好友请求
  let onlineUsers = []; // 保存在线用户数据供其他功能使用
  let lastActiveStatus = true; // 用于跟踪好友的在线状态
  
  // 定期更新聊天列表中的时间显示
  setInterval(updateChatTimeDisplay, 60000); // 每分钟更新一次
  
  // 更新聊天列表中的相对时间显示
  function updateChatTimeDisplay() {
    const chatItems = chatList.querySelectorAll('.user-item');
    chatItems.forEach(item => {
      if (item.dataset.lasttimestamp) {
        const timestamp = parseInt(item.dataset.lasttimestamp);
        const timeStampEl = item.querySelector('.time-stamp');
        if (timeStampEl) {
          timeStampEl.textContent = formatRelativeTime(timestamp);
        }
      }
    });
  }
  
  // 格式化时间
  function formatTime(timestamp) {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 格式化日期
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
  }
  
  // 格式化相对时间（用于聊天列表）
  function formatRelativeTime(timestamp) {
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffMs = now - messageTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    // 今天的消息显示时间
    if (messageTime.toDateString() === now.toDateString()) {
      if (diffMin < 1) {
        return '刚刚';
      } else if (diffMin < 60) {
        return `${diffMin}分钟前`;
      } else {
        return formatTime(timestamp);
      }
    } 
    // 昨天的消息显示"昨天"
    else if (diffDay === 1) {
      return '昨天';
    } 
    // 一周内的消息显示星期几
    else if (diffDay < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[messageTime.getDay()];
    } 
    // 超过一周显示具体日期
    else {
      return `${messageTime.getMonth() + 1}月${messageTime.getDate()}日`;
    }
  }
  
  // 添加日期分割线
  function addDateDivider(timestamp) {
    const dateDivider = document.createElement('div');
    dateDivider.className = 'date-divider';
    dateDivider.textContent = formatDate(timestamp);
    dateDivider.dataset.timestamp = timestamp;
    chatMessages.appendChild(dateDivider);
  }

  // 切换到注册面板
  switchToRegisterButton.addEventListener('click', function() {
    loginPanel.style.display = 'none';
    registerPanel.style.display = 'flex';
  });

  // 切换到登录面板
  switchToLoginButton.addEventListener('click', function() {
    registerPanel.style.display = 'none';
    loginPanel.style.display = 'flex';
  });

  // 注册按钮点击事件
  registerButton.addEventListener('click', function() {
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value;
    const confirmPassword = registerPasswordConfirmInput.value;
    
    // 验证输入
    if (!username || !password) {
      showToast('用户名和密码不能为空', 'error');
      return;
    }
    
    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致', 'error');
      return;
    }
    
    // 发送注册请求
    ipcRenderer.send('register-user', { username, password });
  });
  
  // 登录按钮点击事件
  loginButton.addEventListener('click', function() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    
    if (!username || !password) {
      showToast('用户名和密码不能为空', 'error');
      return;
    }
    
    // 发送登录请求
    ipcRenderer.send('login-user', { username, password });
  });
  
  // 退出按钮点击事件
  logoutButton.addEventListener('click', function() {
    // 发送登出消息给主进程
    ipcRenderer.send('logout-user');
    
    // 重置界面
    chatPanel.style.display = 'none';
    loginPanel.style.display = 'flex';
    usernameInput.value = '';
    passwordInput.value = '';
    chatMessages.innerHTML = '';
    
    // 清空聊天列表（保留群聊）
    while (chatList.children.length > 1) {
      chatList.removeChild(chatList.lastChild);
    }
    
    // 清空好友列表
    friendList.innerHTML = '';
    
    // 清空好友请求
    friendRequests.innerHTML = '';
    
    // 重置状态
    currentUser = { id: '', username: '', token: '' };
    activeChat = 'all';
    currentPage = 1;
    pendingRequests = [];
  });
  
  // 表情按钮点击事件
  emojiButton.addEventListener('click', function() {
    // 常用表情列表
    const emojis = ['😊', '😂', '🤣', '😍', '😒', '😘', '👍', '👏', '🙏', '🎉', 
                   '🌹', '💕', '💔', '😭', '😡', '🤔', '🤗', '🤮', '🥰', '😴',
                   '🤩', '🤑', '🤠', '🤓', '🥺', '😅', '😜', '🙄', '😎', '🤯'];
    
    // 创建表情选择器面板
    const emojiPanel = document.createElement('div');
    emojiPanel.className = 'emoji-panel';
    emojiPanel.style.position = 'absolute';
    emojiPanel.style.bottom = '70px';
    emojiPanel.style.left = '20px';
    emojiPanel.style.backgroundColor = 'white';
    emojiPanel.style.border = '1px solid #ddd';
    emojiPanel.style.borderRadius = '8px';
    emojiPanel.style.padding = '10px';
    emojiPanel.style.display = 'grid';
    emojiPanel.style.gridTemplateColumns = 'repeat(5, 1fr)';
    emojiPanel.style.gap = '5px';
    emojiPanel.style.zIndex = '100';
    emojiPanel.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)';
    
    // 添加表情到面板
    emojis.forEach(emoji => {
      const emojiItem = document.createElement('div');
      emojiItem.textContent = emoji;
      emojiItem.style.fontSize = '20px';
      emojiItem.style.cursor = 'pointer';
      emojiItem.style.textAlign = 'center';
      emojiItem.style.padding = '5px';
      emojiItem.style.borderRadius = '4px';
      emojiItem.style.transition = 'all 0.2s';
      
      emojiItem.addEventListener('mouseover', function() {
        this.style.backgroundColor = '#f0f0f0';
        this.style.transform = 'scale(1.2)';
      });
      
      emojiItem.addEventListener('mouseout', function() {
        this.style.backgroundColor = 'transparent';
        this.style.transform = 'scale(1)';
      });
      
      emojiItem.addEventListener('click', function() {
        // 在当前光标位置插入表情
        const cursorPosition = messageInput.selectionStart;
        const text = messageInput.value;
        messageInput.value = text.slice(0, cursorPosition) + emoji + text.slice(cursorPosition);
        
        // 设置光标位置在插入的表情之后
        messageInput.selectionStart = cursorPosition + emoji.length;
        messageInput.selectionEnd = cursorPosition + emoji.length;
        messageInput.focus();
        
        // 更新输入框高度
        autoResizeTextarea(messageInput);
        
        // 关闭表情面板
        document.body.removeChild(emojiPanel);
      });
      
      emojiPanel.appendChild(emojiItem);
    });
    
    // 点击面板外部关闭面板
    document.addEventListener('click', function closeEmojiPanel(e) {
      if (!emojiPanel.contains(e.target) && e.target !== emojiButton) {
        if (document.body.contains(emojiPanel)) {
          document.body.removeChild(emojiPanel);
        }
        document.removeEventListener('click', closeEmojiPanel);
      }
    });
    
    // 添加到文档中
    document.body.appendChild(emojiPanel);
  });
  
  // 上传图片按钮点击事件
  uploadButton.addEventListener('click', function() {
    // 创建文件输入元素
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    // 监听文件选择
    fileInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const file = this.files[0];
        
        // 检查文件类型和大小
        if (!file.type.match('image.*')) {
          showToast('请选择图片文件', 'error');
          return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB限制
          showToast('图片大小不能超过5MB', 'error');
          return;
        }
        
        // 读取文件为DataURL
        const reader = new FileReader();
        reader.onload = function(e) {
          // 压缩大图片
          compressImage(e.target.result, 800, 600, function(compressedImage) {
            // 创建临时图片预览
            const imgPreview = document.createElement('div');
            imgPreview.className = 'image-preview';
            imgPreview.style.position = 'absolute';
            imgPreview.style.bottom = '70px';
            imgPreview.style.left = '60px';
            imgPreview.style.backgroundColor = 'white';
            imgPreview.style.border = '1px solid #ddd';
            imgPreview.style.borderRadius = '8px';
            imgPreview.style.padding = '10px';
            imgPreview.style.zIndex = '100';
            imgPreview.style.boxShadow = '0 3px 10px rgba(0,0,0,0.1)';
            
            imgPreview.innerHTML = `
              <div style="margin-bottom:10px;font-size:14px;">图片预览:</div>
              <img src="${compressedImage}" style="max-width:200px;max-height:200px;border-radius:4px;">
              <div style="margin-top:10px;display:flex;justify-content:flex-end;">
                <button id="cancelSendImg" style="margin-right:10px;padding:5px 10px;border:1px solid #ddd;background:#f5f5f5;border-radius:4px;cursor:pointer;">取消</button>
                <button id="confirmSendImg" style="padding:5px 10px;background:#3498db;color:white;border:none;border-radius:4px;cursor:pointer;">发送</button>
              </div>
            `;
            
            document.body.appendChild(imgPreview);
            
            // 取消发送按钮
            document.getElementById('cancelSendImg').addEventListener('click', function() {
              document.body.removeChild(imgPreview);
            });
            
            // 确认发送按钮
            document.getElementById('confirmSendImg').addEventListener('click', function() {
              // 发送图片消息 - 使用HTML来确保图片能够显示
              const messageContent = `<img src="${compressedImage}" style="max-width:200px;max-height:200px;border-radius:4px;" />`;
              
              const message = {
                to: activeChat,
                content: messageContent
              };
              
              // 发送消息给主进程
              ipcRenderer.send('send-message', message);
              
              // 生成临时ID，格式为temp-timestamp
              const tempId = `temp-${Date.now()}`;
              
              // 立即在本地显示消息
              addMessage({
                id: tempId,
                from: currentUser.id,
                fromUsername: currentUser.username,
                to: activeChat,
                content: messageContent,
                timestamp: Date.now(),
                isSelf: true
              });
              
              // 关闭预览
              document.body.removeChild(imgPreview);
            });
          });
        };
        
        reader.readAsDataURL(file);
      }
    });
    
    // 触发文件选择对话框
    document.body.appendChild(fileInput);
    fileInput.click();
    
    // 使用完后移除
    setTimeout(() => {
      if (document.body.contains(fileInput)) {
        document.body.removeChild(fileInput);
      }
    }, 1000);
  });
  
  // 图片压缩函数
  function compressImage(dataUrl, maxWidth, maxHeight, callback) {
    const img = new Image();
    img.src = dataUrl;
    img.onload = function() {
      let width = img.width;
      let height = img.height;
      
      // 如果图片尺寸已经很小，则不需要压缩
      if (width <= maxWidth && height <= maxHeight) {
        callback(dataUrl);
        return;
      }
      
      // 计算新的尺寸，保持比例
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round(width * maxHeight / height);
          height = maxHeight;
        }
      }
      
      // 创建画布
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // 绘制图片
      ctx.drawImage(img, 0, 0, width, height);
      
      // 转换为DataURL
      // 使用较低质量的JPEG来减小体积
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
      callback(compressedDataUrl);
    };
    
    // 处理图片加载失败
    img.onerror = function() {
      console.error('图片加载失败');
      callback(dataUrl); // 失败时返回原始数据
    };
  }
  
  // 刷新聊天按钮点击事件
  refreshChatButton.addEventListener('click', function() {
    // 清空聊天消息
    chatMessages.innerHTML = '';
    
    // 重新加载当前聊天的消息
    ipcRenderer.send('load-messages', {
      chatId: activeChat,
      page: 1
    });
    
    showToast('聊天已刷新', 'info');
  });
  
  // 清空聊天按钮点击事件
  clearChatButton.addEventListener('click', function() {
    // 只清空显示，不影响服务器数据
    chatMessages.innerHTML = '';
    
    // 添加清空提示
    addMessage({
      from: 'system',
      content: '聊天记录已清空',
      timestamp: Date.now()
    });
  });
  
  // 发送消息按钮点击事件
  sendButton.addEventListener('click', sendMessage);
  
  // 按Enter键发送消息
  messageInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  
  // 输入框自动调整高度
  messageInput.addEventListener('input', function() {
    autoResizeTextarea(this);
  });
  
  // 自动调整文本区域高度
  function autoResizeTextarea(textarea) {
    // 重置高度
    textarea.style.height = 'auto';
    
    // 根据内容设置新高度，最大120px，最小24px
    const newHeight = Math.max(Math.min(textarea.scrollHeight, 120), 24);
    textarea.style.height = newHeight + 'px';
    
    // 更新发送按钮样式
    if (textarea.value.trim()) {
      sendButton.classList.add('active');
    } else {
      sendButton.classList.remove('active');
    }
  }

  // 加载更多消息
  loadMoreButton.addEventListener('click', function() {
    if (hasMoreMessages) {
      currentPage++;
      ipcRenderer.send('load-messages', { chatId: activeChat, page: currentPage });
    }
  });
  
  // 发送消息
  function sendMessage() {
    const content = messageInput.value.trim();
    if (content) {
      const message = {
        to: activeChat,
        content: content
      };
      
      // 发送消息给主进程
      ipcRenderer.send('send-message', message);
      
      // 生成临时ID，格式为temp-timestamp
      const tempId = `temp-${Date.now()}`;
      const timestamp = Date.now();
      
      // 立即在本地显示消息
      addMessage({
        id: tempId,
        from: currentUser.id,
        fromUsername: currentUser.username,
        to: activeChat,
        content: content,
        timestamp: timestamp,
        isSelf: true
      });
      
      // 更新聊天列表中的最近消息和时间
      if (activeChat === 'all') {
        // 群聊消息，更新群聊时间戳
        const groupChatItem = Array.from(chatList.children).find(item => item.dataset.userid === 'all');
        if (groupChatItem) {
          // 更新时间戳
          groupChatItem.dataset.lasttimestamp = timestamp;
          localStorage.setItem('groupChatLastTime', timestamp);
          
          // 更新时间显示
          const timeStampEl = groupChatItem.querySelector('.time-stamp');
          if (timeStampEl) {
            timeStampEl.textContent = formatRelativeTime(timestamp);
          }
          
          // 如果群聊不在最上方，移到顶部
          if (groupChatItem !== chatList.firstChild) {
            chatList.removeChild(groupChatItem);
            chatList.insertBefore(groupChatItem, chatList.firstChild);
          }
        }
      } else {
        // 私聊消息处理（现有逻辑）
        let existingChatItem = Array.from(chatList.children).find(item => item.dataset.userid === activeChat);
        if (existingChatItem) {
          // 更新时间戳
          existingChatItem.dataset.lasttimestamp = timestamp;
          
          // 更新最近消息和时间显示
          const lastMessageEl = existingChatItem.querySelector('.last-message');
          const timeStampEl = existingChatItem.querySelector('.time-stamp');
          
          if (lastMessageEl) {
            lastMessageEl.textContent = content.replace(/<[^>]*>/g, '').substring(0, 20) + (content.length > 20 ? '...' : '');
          }
          
          if (timeStampEl) {
            timeStampEl.textContent = formatRelativeTime(timestamp);
          }
          
          // 移动到顶部
          chatList.removeChild(existingChatItem);
          chatList.insertBefore(existingChatItem, chatList.firstChild);
        }
      }
      
      // 清空输入框并重置高度
      messageInput.value = '';
      messageInput.style.height = '24px';
      sendButton.classList.remove('active');
      
      // 让输入框保持焦点
      messageInput.focus();
    }
  }
  
  // 在聊天窗口添加消息
  function addMessage(message, prepend = false, addTimeDivider = true) {
    // 记录当前滚动位置
    const isAtBottom = chatMessages.scrollHeight - chatMessages.clientHeight <= chatMessages.scrollTop + 50;
    
    // 获取安全的内容
    const safeContent = message.content ? message.content.toString() : '';
    const safeUsername = message.fromUsername ? message.fromUsername.toString() : '未知用户';
    
    // 检查是否是系统消息
    if (message.from === 'system') {
      // 系统消息处理
      const systemMessage = document.createElement('div');
      systemMessage.className = 'message-system';
      
      const systemContent = document.createElement('div');
      systemContent.className = 'system-content';
      systemContent.innerHTML = safeContent;
      
      systemMessage.appendChild(systemContent);
      
      if (prepend) {
        chatMessages.insertBefore(systemMessage, chatMessages.firstChild);
      } else {
        chatMessages.appendChild(systemMessage);
      }
      
      // 如果之前是在底部，则滚动到底部
      if (isAtBottom && !prepend) {
        scrollToBottom();
      }
      return;
    }
    
    // 检查是否需要添加日期分割线（仅在非prepend模式下添加）
    if (!prepend && addTimeDivider) {
      const messageDate = new Date(message.timestamp).toDateString();
      
      // 获取最后一个日期分割线
      const dateDividers = chatMessages.querySelectorAll('.date-divider');
      let shouldAddDivider = true;
      
      if (dateDividers.length > 0) {
        const lastDivider = dateDividers[dateDividers.length - 1];
        // 提取日期部分进行比较
        const dividerDate = new Date(lastDivider.dataset.timestamp).toDateString();
        
        // 如果日期相同，不添加新的分割线
        if (dividerDate === messageDate) {
          shouldAddDivider = false;
        }
      }
      
      // 添加日期分割线
      if (shouldAddDivider) {
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        dateDivider.textContent = formatDate(message.timestamp);
        dateDivider.dataset.timestamp = message.timestamp;
        chatMessages.appendChild(dateDivider);
      }
    }
    
    // 检查是否需要添加时间线（仅在非prepend模式下添加，且addTimeDivider为true）
    if (!prepend && addTimeDivider && chatMessages.children.length > 0) {
      // 获取最后一个消息的时间戳
      const messageElements = Array.from(chatMessages.querySelectorAll('.message-group'));
      if (messageElements.length > 0) {
        const lastMessage = messageElements[messageElements.length - 1];
        const lastTimestamp = parseInt(lastMessage.dataset.timestamp);
        const currentTimestamp = message.timestamp;
        
        // 如果与上一条消息的时间间隔大于5分钟，则添加时间线
        if (currentTimestamp - lastTimestamp >= 5 * 60 * 1000) {
          const timelineDivider = document.createElement('div');
          timelineDivider.className = 'time-divider';
          timelineDivider.textContent = formatTime(message.timestamp);
          timelineDivider.dataset.timestamp = message.timestamp;
          chatMessages.appendChild(timelineDivider);
        }
      }
    }
    
    // 创建消息元素组
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    messageGroup.dataset.id = message.id || '';
    messageGroup.dataset.timestamp = message.timestamp;
    messageGroup.dataset.from = message.from;
    
    // 检查是否是图片消息
    const isImageMessage = safeContent.includes('<img');
    
    // 确定消息方向 - 自己发送的在右侧，收到的在左侧
    const isSelfMessage = message.isSelf || message.from === currentUser.id;
    
    // 检查是否是来自同一发送者的连续消息
    let isConsecutive = false;
    if (!prepend && chatMessages.children.length > 0) {
      // 获取最后一个消息组（跳过日期分割线）
      const lastItems = Array.from(chatMessages.children).reverse();
      const lastMessageGroup = lastItems.find(item => item.classList.contains('message-group'));
      
      if (lastMessageGroup && lastMessageGroup.dataset.from === message.from) {
        const lastTime = parseInt(lastMessageGroup.dataset.timestamp);
        const currentTime = message.timestamp;
        
        // 如果与上一条消息的时间间隔小于5分钟，则视为连续消息
        if (currentTime - lastTime < 5 * 60 * 1000) {
          isConsecutive = true;
          messageGroup.classList.add('consecutive');
        }
      }
    }
    
    if (isSelfMessage) {
      messageGroup.className += ' right';
      
      // 创建消息气泡
      const messageBubble = document.createElement('div');
      messageBubble.className = 'message message-sent';
      
      // 创建消息内容元素
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      contentDiv.innerHTML = safeContent;
      
      // 如果是图片消息，添加图片加载事件处理
      if (isImageMessage) {
        const imgElement = contentDiv.querySelector('img');
        if (imgElement) {
          // 添加loading状态
          messageBubble.classList.add('loading');
          
          // 图片加载完成时的处理
          imgElement.onload = function() {
            messageBubble.classList.remove('loading');
            // 图片加载完成后滚动到底部
            if (!prepend && isAtBottom) {
              scrollToBottom();
            }
          };
          
          // 图片加载失败时的处理
          imgElement.onerror = function() {
            messageBubble.classList.remove('loading');
            this.style.display = 'none';
            contentDiv.innerHTML += '<div class="image-error">图片加载失败</div>';
          };
        }
      }
      
      messageBubble.appendChild(contentDiv);
      
      // 创建头像
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.style.backgroundColor = 'var(--primary-color)';
      avatar.textContent = currentUser.username.charAt(0).toUpperCase();
      
      // 先添加头像，再添加消息气泡（但因为是右对齐，UI会正确显示）
      messageGroup.appendChild(avatar);
      messageGroup.appendChild(messageBubble);
      
      // 如果是连续消息，则隐藏头像
      if (isConsecutive) {
        avatar.style.visibility = 'hidden';
        messageGroup.style.marginTop = '4px'; // 减小连续消息的间距
      }
    } else {
      messageGroup.className += ' left';
      
      // 获取发送者的首字母作为头像
      const senderInitial = safeUsername.charAt(0).toUpperCase();
      
      // 创建头像
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.style.backgroundColor = getRandomColorById(message.from);
      avatar.textContent = senderInitial;
      
      // 创建消息气泡
      const messageBubble = document.createElement('div');
      messageBubble.className = 'message message-received';
      
      // 创建消息内容元素
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      contentDiv.innerHTML = safeContent;
      
      // 如果是图片消息，添加图片加载事件处理
      if (isImageMessage) {
        const imgElement = contentDiv.querySelector('img');
        if (imgElement) {
          // 添加loading状态
          messageBubble.classList.add('loading');
          
          // 图片加载完成时的处理
          imgElement.onload = function() {
            messageBubble.classList.remove('loading');
            // 图片加载完成后滚动到底部
            if (!prepend && isAtBottom) {
              scrollToBottom();
            }
          };
          
          // 图片加载失败时的处理
          imgElement.onerror = function() {
            messageBubble.classList.remove('loading');
            this.style.display = 'none';
            contentDiv.innerHTML += '<div class="image-error">图片加载失败</div>';
          };
        }
      }
      
      messageBubble.appendChild(contentDiv);
      
      // 先添加头像，再添加消息气泡（确保头像在左侧）
      messageGroup.appendChild(avatar);
      messageGroup.appendChild(messageBubble);
      
      // 如果是连续消息，则隐藏头像
      if (isConsecutive) {
        avatar.style.visibility = 'hidden';
        messageGroup.style.marginTop = '4px'; // 减小连续消息的间距
      }
    }
    
    // 将消息添加到聊天窗口中
    if (prepend) {
      chatMessages.insertBefore(messageGroup, chatMessages.firstChild);
    } else {
      chatMessages.appendChild(messageGroup);
      
      // 如果之前是在底部，且不是正在加载的图片消息，则滚动到底部
      if (isAtBottom && (!isImageMessage)) {
        scrollToBottom();
      }
    }
  }
  
      // 滚动到底部
  function scrollToBottom() {
    // 使用requestAnimationFrame确保DOM更新后再滚动
    requestAnimationFrame(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }
  
  // 为每个用户ID生成固定的颜色
  function getRandomColorById(userId) {
    const colors = [
      '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#1abc9c',
      '#f1c40f', '#e67e22', '#d35400', '#bdc3c7', '#7f8c8d'
    ];
    
    if (userId) {
      // 使用用户ID的数字部分作为颜色索引，使同一用户始终有相同颜色
      let sum = 0;
      for (let i = 0; i < userId.length; i++) {
        sum += userId.charCodeAt(i);
      }
      return colors[sum % colors.length];
    }
    
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // 切换聊天对象
  function switchChat(userId, name) {
    activeChat = userId;
    chatName.textContent = name;
    currentPage = 1;
    
    // 更新选中状态
    const items = chatList.querySelectorAll('.user-item');
    items.forEach(item => {
      if (item.dataset.userid === userId) {
        item.classList.add('active');
        
        // 清除该聊天的未读消息标记
        const unreadBadge = item.querySelector('.unread-badge');
        if (unreadBadge) {
          unreadBadge.style.display = 'none';
          unreadBadge.textContent = '0';
        }
      } else {
        item.classList.remove('active');
      }
    });
    
    // 清空聊天记录
    chatMessages.innerHTML = '';
    
    // 添加切换提示
    addMessage({
      from: 'system',
      content: `已切换到${name === '群聊' ? '群聊' : `与 ${name} 的私聊`}`,
      timestamp: Date.now()
    });
    
    // 如果不是群聊，检查是否是好友
    if (userId !== 'all') {
      // 查找当前用户是否在好友列表中
      const isFriend = Array.from(friendList.children)
        .some(item => item.dataset.userid === userId);
      
      if (!isFriend) {
        // 显示添加好友提示
        addMessage({
          from: 'system',
          content: `${name} 还不是你的好友，<a href="javascript:void(0);" class="add-contact" data-userid="${userId}" data-username="${name}">点击这里添加</a>`,
          timestamp: Date.now()
        });
        
        // 添加事件监听
        setTimeout(() => {
          const addContactLink = chatMessages.querySelector('.add-contact');
          if (addContactLink) {
            addContactLink.addEventListener('click', function() {
              const userId = this.dataset.userid;
              sendFriendRequest(userId);
              this.textContent = '好友请求已发送';
              this.style.color = '#999';
              this.style.textDecoration = 'none';
              this.style.cursor = 'default';
              this.style.pointerEvents = 'none';
            });
          }
        }, 100);
      }
    }
    
    // 加载历史消息
    ipcRenderer.send('load-messages', { chatId: userId, page: currentPage });
  }
  
  // 显示提示消息
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // 添加显示类
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // 3秒后移除
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  
  // 监听聊天列表点击事件
  chatList.addEventListener('click', function(e) {
    const userItem = e.target.closest('.user-item');
    if (userItem) {
      const userId = userItem.dataset.userid;
      const name = userItem.querySelector('.user-name').textContent;
      switchChat(userId, name);
    }
  });
  
  // 监听注册响应
  ipcRenderer.on('register-response', function(event, response) {
    if (response.success) {
      // 注册成功，自动登录
      currentUser = {
        id: response.user.id,
        username: response.user.username,
        token: response.token
      };
      
      // 保存token到localStorage
      localStorage.setItem('user', JSON.stringify({
        id: currentUser.id,
        username: currentUser.username,
        token: currentUser.token
      }));
      
      // 更新界面
      registerPanel.style.display = 'none';
      chatPanel.style.display = 'grid';
      currentUserAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
      currentUsername.textContent = currentUser.username;
      
      // 请求通知权限
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
      
      // 添加欢迎消息
      addMessage({
        from: 'system',
        content: `欢迎来到飞聊，${currentUser.username}！`,
        timestamp: Date.now()
      });
      
      // 初始化聊天列表
      initChatList();
      
      showToast('注册成功并已登录', 'success');
    } else {
      showToast(response.message || '注册失败', 'error');
    }
  });
  
  // 监听登录响应
  ipcRenderer.on('login-response', function(event, response) {
    if (response.success) {
      // 登录成功
      currentUser = {
        id: response.user.id,
        username: response.user.username,
        token: response.token
      };
      
      // 保存token到localStorage
      localStorage.setItem('user', JSON.stringify({
        id: currentUser.id,
        username: currentUser.username,
        token: currentUser.token
      }));
      
      // 更新界面
      loginPanel.style.display = 'none';
      chatPanel.style.display = 'grid';
      currentUserAvatar.textContent = currentUser.username.charAt(0).toUpperCase();
      currentUsername.textContent = currentUser.username;
      
      // 请求通知权限
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
      }
      
      // 添加欢迎消息
      addMessage({
        from: 'system',
        content: `欢迎回来，${currentUser.username}！`,
        timestamp: Date.now()
      });
      
      // 初始化聊天列表
      initChatList();
      
      showToast('登录成功', 'success');
    } else {
      showToast(response.message || '登录失败', 'error');
    }
  });
  
  // 监听用户列表更新事件
  ipcRenderer.on('update-user-list', function(event, users) {
    // 不再自动将所有在线用户添加到聊天列表中
    // 仅更新已有聊天用户的状态
    
    // 保存在线用户数据供其他功能使用
    onlineUsers = users;
    
    // 更新好友列表中的在线状态
    const friendItems = friendList.querySelectorAll('.user-item');
    friendItems.forEach(item => {
      const userId = item.dataset.userid;
      const isOnline = users.some(user => user.id === userId);
      const statusEl = item.querySelector('.user-status');
      if (statusEl) {
        statusEl.className = `user-status ${isOnline ? 'online' : 'offline'}`;
      }
    });
    
    // 如果当前聊天的用户已下线，添加提示消息
    if (activeChat !== 'all') {
      const userStillActive = users.some(user => user.id === activeChat);
      if (!userStillActive && lastActiveStatus) {
        addMessage({
          from: 'system',
          content: `对方已离线，消息将在对方上线后发送`,
          timestamp: Date.now()
        });
        lastActiveStatus = false;
      } else if (userStillActive && !lastActiveStatus) {
        addMessage({
          from: 'system',
          content: `对方已上线`,
          timestamp: Date.now()
        });
        lastActiveStatus = true;
      }
    }
  });
  
  // 监听新消息事件
  ipcRenderer.on('new-message', function(event, message) {
    // 检查是否是自己发送的消息（群聊或私聊），避免重复显示
    if (message.from === currentUser.id) {
      // 查找所有可能是本地已添加的消息元素
      const messageElements = chatMessages.querySelectorAll('.message-group');
      let isDuplicate = false;
      
      // 遍历所有消息元素，查找匹配的消息
      messageElements.forEach(element => {
        // 检查是否是临时ID格式(temp-timestamp)
        if (element.dataset.id && element.dataset.id.startsWith('temp-')) {
          // 判断图片消息需要特殊处理
          const isImageMsg = message.content.includes('<img');
          const contentElement = element.querySelector('.message-content');
          
          if (contentElement) {
            // 对于图片消息，只要确认都是图片就认为是同一条消息
            if (isImageMsg && contentElement.innerHTML.includes('<img')) {
              element.dataset.id = message.id;
              
              // 更新图片内容，确保显示正确
              if (contentElement.innerHTML !== message.content) {
                contentElement.innerHTML = message.content;
              }
              
              isDuplicate = true;
            } 
            // 文本消息直接比较内容
            else if (!isImageMsg && contentElement.innerHTML === message.content) {
              element.dataset.id = message.id;
              isDuplicate = true;
            }
          }
        }
      });
      
      // 如果找到匹配的消息，不重复添加
      if (isDuplicate) {
        return;
      }
    }
    
    // 检查当前消息是否属于当前活动会话
    const isCurrentChat = (message.from === activeChat) || 
                         (message.to === activeChat && message.from === currentUser.id) ||
                         (message.to === 'all' && activeChat === 'all') || 
                         (message.to === currentUser.id && message.from === activeChat);
    
    // 如果消息属于当前聊天，显示消息
    if (isCurrentChat) {
      // 添加消息（启用时间线显示）
      addMessage(message, false, true);
      
      // 如果窗口不在活跃状态，播放通知声音和显示通知
      if (document.hidden) {
        // 显示桌面通知（如果用户允许）
        if (Notification.permission === "granted") {
          const notificationTitle = message.from === currentUser.id ? "新消息" : `来自 ${message.fromUsername} 的新消息`;
          const notification = new Notification(notificationTitle, {
            body: message.content.replace(/<[^>]*>/g, ''), // 移除HTML标签
            icon: './assets/icon.png' // 应用图标
          });
          
          // 点击通知时聚焦应用
          notification.onclick = function() {
            window.focus();
          };
        }
      }
      
      // 如果是私聊收到消息，更新聊天列表中的时间戳
      if (message.to === currentUser.id) {
        // 找到对应的聊天项
        let chatItem = Array.from(chatList.children).find(item => item.dataset.userid === message.from);
        if (chatItem) {
          // 更新时间戳
          chatItem.dataset.lasttimestamp = message.timestamp;
          
          // 更新时间显示
          const timeStampEl = chatItem.querySelector('.time-stamp');
          if (timeStampEl) {
            timeStampEl.textContent = formatRelativeTime(message.timestamp);
          }
          
          // 更新最近消息显示
          const lastMessageEl = chatItem.querySelector('.last-message');
          if (lastMessageEl) {
            lastMessageEl.textContent = message.content.replace(/<[^>]*>/g, '').substring(0, 20) + (message.content.length > 20 ? '...' : '');
          }
          
          // 移动到顶部
          chatList.removeChild(chatItem);
          chatList.insertBefore(chatItem, chatList.firstChild);
        }
      }
    } else {
      // 如果不是当前聊天，不显示通知，只更新未读消息计数
      // 不再弹出通知
    }
    
    // 处理群聊消息（来自其他用户的消息）
    if (message.to === 'all' && message.from !== currentUser.id) {
      // 更新群聊时间戳
      const timestamp = message.timestamp;
      const groupChatItem = Array.from(chatList.children).find(item => item.dataset.userid === 'all');
      
      if (groupChatItem) {
        // 更新时间戳
        groupChatItem.dataset.lasttimestamp = timestamp;
        localStorage.setItem('groupChatLastTime', timestamp);
        
        // 更新最近消息内容和时间
        const lastMessageEl = groupChatItem.querySelector('.last-message');
        const timeStampEl = groupChatItem.querySelector('.time-stamp');
        
        if (lastMessageEl) {
          lastMessageEl.textContent = `${message.fromUsername}: ${message.content.replace(/<[^>]*>/g, '').substring(0, 15)}${message.content.length > 15 ? '...' : ''}`;
        }
        
        if (timeStampEl) {
          timeStampEl.textContent = formatRelativeTime(timestamp);
        }
        
        // 移动到顶部
        if (groupChatItem !== chatList.firstChild) {
          chatList.removeChild(groupChatItem);
          chatList.insertBefore(groupChatItem, chatList.firstChild);
        }
        
        // 如果当前不在群聊中，增加未读数量
        if (activeChat !== 'all') {
          const unreadBadge = groupChatItem.querySelector('.unread-badge');
          if (unreadBadge) {
            const currentCount = parseInt(unreadBadge.textContent) || 0;
            unreadBadge.textContent = currentCount + 1;
            unreadBadge.style.display = 'flex';
          } else {
            // 如果未读标记不存在，创建一个
            const badge = document.createElement('div');
            badge.className = 'unread-badge';
            badge.textContent = '1';
            groupChatItem.querySelector('.chat-meta').appendChild(badge);
          }
        }
      }
    }
    
    // 如果消息来自自己但发给他人（私聊）
    if (message.from === currentUser.id && message.to !== 'all') {
      // 找到对应的聊天项
      let chatItem = Array.from(chatList.children).find(item => item.dataset.userid === message.to);
      if (chatItem) {
        // 更新时间戳
        chatItem.dataset.lasttimestamp = message.timestamp;
        
        // 更新时间显示
        const timeStampEl = chatItem.querySelector('.time-stamp');
        if (timeStampEl) {
          timeStampEl.textContent = formatRelativeTime(message.timestamp);
        }
        
        // 更新最近消息
        const lastMessageEl = chatItem.querySelector('.last-message');
        if (lastMessageEl) {
          lastMessageEl.textContent = message.content.replace(/<[^>]*>/g, '').substring(0, 20) + (message.content.length > 20 ? '...' : '');
        }
        
        // 移动到顶部
        chatList.removeChild(chatItem);
        chatList.insertBefore(chatItem, chatList.firstChild);
      } else {
        // 如果聊天项不存在，可能是新的私聊，创建新的聊天项
        const friendItem = Array.from(friendList.children).find(item => item.dataset.userid === message.to);
        if (friendItem) {
          const username = friendItem.querySelector('.user-name').textContent;
          const avatarColor = friendItem.querySelector('.user-avatar').style.backgroundColor;
          const avatarText = friendItem.querySelector('.user-avatar').textContent;
          
          // 创建新的聊天项
          const newChatItem = document.createElement('li');
          newChatItem.className = 'user-item';
          newChatItem.dataset.userid = message.to;
          newChatItem.dataset.lasttimestamp = message.timestamp;
          
          newChatItem.innerHTML = `
            <div class="user-avatar" style="background-color: ${avatarColor}">${avatarText}</div>
            <div class="chat-info">
              <div class="user-name">${username}</div>
              <div class="last-message">${message.content.replace(/<[^>]*>/g, '').substring(0, 20)}${message.content.length > 20 ? '...' : ''}</div>
            </div>
            <div class="chat-meta">
              <div class="time-stamp">${formatRelativeTime(message.timestamp)}</div>
            </div>
          `;
          
          // 添加到列表顶部
          chatList.insertBefore(newChatItem, chatList.firstChild);
        }
      }
    }
    
    // 如果收到私聊消息且发送者不是自己，确保发送者在聊天列表中
    if (!message.isSelf && message.to !== 'all' && message.from !== currentUser.id) {
      // 检查发送者是否已存在于聊天列表
      let existingChatItem = Array.from(chatList.children).find(item => item.dataset.userid === message.from);
      if (!existingChatItem) {
        // 添加发送者到聊天列表
        const chatItem = document.createElement('li');
        chatItem.className = 'user-item';
        chatItem.dataset.userid = message.from;
        chatItem.dataset.lasttimestamp = message.timestamp;
        
        // 格式化时间为相对时间
        const timeStr = formatRelativeTime(message.timestamp);
        
        chatItem.innerHTML = `
          <div class="user-avatar" style="background-color: ${getRandomColorById(message.from)}">${message.fromUsername.charAt(0).toUpperCase()}</div>
          <div class="chat-info">
            <div class="user-name">${message.fromUsername}</div>
            <div class="last-message">${message.content.replace(/<[^>]*>/g, '').substring(0, 20)}${message.content.length > 20 ? '...' : ''}</div>
          </div>
          <div class="chat-meta">
            <div class="time-stamp">${timeStr}</div>
            <div class="unread-badge">1</div>
          </div>
        `;
        
        // 添加到列表顶部
        chatList.insertBefore(chatItem, chatList.firstChild);
        
        // 不再显示通知，使用未读标记提醒用户
      } else {
        // 更新最近消息和时间
        existingChatItem.dataset.lasttimestamp = message.timestamp;
        
        // 格式化时间为相对时间
        const timeStr = formatRelativeTime(message.timestamp);
        
        // 更新最近消息内容和时间
        const lastMessageEl = existingChatItem.querySelector('.last-message');
        const timeStampEl = existingChatItem.querySelector('.time-stamp');
        
        if (lastMessageEl) {
          lastMessageEl.textContent = message.content.replace(/<[^>]*>/g, '').substring(0, 20) + (message.content.length > 20 ? '...' : '');
        }
        
        if (timeStampEl) {
          timeStampEl.textContent = timeStr;
        }
        
        // 移动到顶部
        chatList.removeChild(existingChatItem);
        chatList.insertBefore(existingChatItem, chatList.firstChild);
        
        // 如果已在列表中但不是当前聊天，增加未读数量
        if (activeChat !== message.from) {
          const unreadBadge = existingChatItem.querySelector('.unread-badge');
          if (unreadBadge) {
            const currentCount = parseInt(unreadBadge.textContent) || 0;
            unreadBadge.textContent = currentCount + 1;
            unreadBadge.style.display = 'flex';
          } else {
            // 如果未读标记不存在，创建一个
            const badge = document.createElement('div');
            badge.className = 'unread-badge';
            badge.textContent = '1';
            existingChatItem.querySelector('.chat-meta').appendChild(badge);
          }
        }
      }
    }
  });
  
  // 监听历史消息事件
  ipcRenderer.on('history-messages', function(event, data) {
    hasMoreMessages = data.hasMore;
    
    // 显示/隐藏加载更多按钮
    loadMoreButton.style.display = hasMoreMessages ? 'block' : 'none';
    
    // 如果是第1页，清空消息区域
    if (data.page === 1) {
      chatMessages.innerHTML = '';
    }
    
    if (data.messages.length === 0) return;
    
    // 记录当前滚动位置
    const scrollPosition = chatMessages.scrollTop;
    const oldScrollHeight = chatMessages.scrollHeight;
    
    // --------第一步：按时间排序消息--------
    const messages = [...data.messages].sort((a, b) => a.timestamp - b.timestamp);
    console.log("加载消息数:", messages.length);
    
    // --------第二步：对消息进行分组处理--------
    // 按日期分组，每日内再细分时间段（按微信风格30分钟为一个时间段）
    const messageGroups = {};
    const TIME_SEGMENT = 30 * 60 * 1000; // 30分钟为一个时间段
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      const dateString = date.toDateString();
      
      // 计算这条消息属于哪个时间段
      const dayMinutes = date.getHours() * 60 + date.getMinutes();
      const timeSegment = Math.floor(dayMinutes / 30);
      
      // 每天的每个时间段创建一个组
      const groupKey = `${dateString}:${timeSegment}`;
      
      if (!messageGroups[groupKey]) {
        messageGroups[groupKey] = {
          date: dateString,
          timeSegment: timeSegment,
          timestamp: msg.timestamp, // 使用该时间段第一条消息的时间戳
          messages: []
        };
      }
      
      messageGroups[groupKey].messages.push(msg);
    });
    
    const sortedKeys = Object.keys(messageGroups).sort((a, b) => {
      const groupA = messageGroups[a];
      const groupB = messageGroups[b];
      return groupA.timestamp - groupB.timestamp;
    });
    
    // --------第三步：插入日期和时间分割线，并添加消息--------
    let lastDateString = null;
    
    // 遍历每个分组
    sortedKeys.forEach(key => {
      const group = messageGroups[key];
      const dateString = group.date;
      const msgs = group.messages;
      
      // 如果日期变了，添加日期分割线
      if (dateString !== lastDateString) {
        const dateDivider = document.createElement('div');
        dateDivider.className = 'date-divider';
        dateDivider.textContent = formatDate(group.timestamp);
        dateDivider.dataset.timestamp = group.timestamp;
        
        if (data.page === 1) {
          chatMessages.appendChild(dateDivider);
        } else {
          // 按时间顺序插入
          insertElementByTimestamp(dateDivider, group.timestamp);
        }
        
        lastDateString = dateString;
      }
      
      // 为每个时间段添加时间线，无论消息数量多少
      const firstMsg = msgs[0];
      const timeTimestamp = firstMsg.timestamp;
      
      // 创建时间线
      const timeDivider = document.createElement('div');
      timeDivider.className = 'time-divider';
      timeDivider.textContent = formatTime(timeTimestamp);
      timeDivider.dataset.timestamp = timeTimestamp;
      
      if (data.page === 1) {
        chatMessages.appendChild(timeDivider);
      } else {
        // 按时间顺序插入
        insertElementByTimestamp(timeDivider, timeTimestamp);
      }
      
      // 处理这个时间段的消息
      let prevMsg = null;
      
      msgs.forEach(msg => {
        // 检查是否是连续消息
        if (prevMsg && 
            prevMsg.from === msg.from && 
            Math.abs(msg.timestamp - prevMsg.timestamp) < 5 * 60 * 1000) {
          msg.isConsecutive = true;
        }
        
        if (data.page === 1) {
          addMessage(msg, false, false); // 不添加额外的时间线，因为已经在分组中添加了
        } else {
          addMessageAtPosition(msg, msg.timestamp);
        }
        
        prevMsg = msg;
      });
    });
    
    // 辅助函数：按时间戳插入元素
    function insertElementByTimestamp(element, timestamp) {
      const elements = Array.from(chatMessages.querySelectorAll('[data-timestamp]'));
      
      // 找到第一个时间戳大于当前元素的元素
      const insertPoint = elements.find(el => parseInt(el.dataset.timestamp) > timestamp);
      
      if (insertPoint) {
        chatMessages.insertBefore(element, insertPoint);
      } else {
        chatMessages.appendChild(element);
      }
    }
    
    // 保持滚动位置或滚动到底部
    if (data.page === 1) {
      // 新聊天，滚动到底部
      scrollToBottom();
      
      // 如果是私聊，更新聊天列表项的最新时间戳
      if (activeChat !== 'all' && messages.length > 0) {
        // 在历史消息中找到最近的一条消息
        const latestMessage = [...messages].sort((a, b) => b.timestamp - a.timestamp)[0];
        if (latestMessage) {
          // 更新聊天列表中的时间戳
          const chatItem = Array.from(chatList.children).find(item => item.dataset.userid === activeChat);
          if (chatItem) {
            // 只有当新时间戳更大时才更新
            const currentTimestamp = parseInt(chatItem.dataset.lasttimestamp) || 0;
            if (latestMessage.timestamp > currentTimestamp) {
              chatItem.dataset.lasttimestamp = latestMessage.timestamp;
              const timeStampEl = chatItem.querySelector('.time-stamp');
              if (timeStampEl) {
                timeStampEl.textContent = formatRelativeTime(latestMessage.timestamp);
              }
            }
          }
        }
      }
    } else {
      // 加载更多历史消息，保持相对滚动位置
      requestAnimationFrame(() => {
        chatMessages.scrollTop = scrollPosition + (chatMessages.scrollHeight - oldScrollHeight);
      });
    }
  });
  
  // 在特定位置添加消息（用于历史记录加载）
  function addMessageAtPosition(message, timestamp) {
    // 创建消息元素
    const messageGroup = createMessageElement(message);
    
    // 查找插入位置
    const elements = Array.from(chatMessages.querySelectorAll('.message-group, .date-divider'));
    const insertPoint = elements.find(el => 
      el.dataset.timestamp && parseInt(el.dataset.timestamp) > timestamp
    );
    
    if (insertPoint) {
      chatMessages.insertBefore(messageGroup, insertPoint);
    } else {
      chatMessages.appendChild(messageGroup);
    }
  }
  
  // 创建消息元素（从addMessage函数中提取主要逻辑）
  function createMessageElement(message) {
    // 获取安全的内容
    const safeContent = message.content ? message.content.toString() : '';
    const safeUsername = message.fromUsername ? message.fromUsername.toString() : '未知用户';
    
    // 创建消息元素组
    const messageGroup = document.createElement('div');
    messageGroup.className = 'message-group';
    messageGroup.dataset.id = message.id || '';
    messageGroup.dataset.timestamp = message.timestamp;
    messageGroup.dataset.from = message.from;
    
    // 如果是连续消息，添加连续类
    if (message.isConsecutive) {
      messageGroup.classList.add('consecutive');
    }
    
    // 检查是否是图片消息
    const isImageMessage = safeContent.includes('<img');
    
    // 确定消息方向 - 自己发送的在右侧，收到的在左侧
    const isSelfMessage = message.isSelf || message.from === currentUser.id;
    
    if (isSelfMessage) {
      messageGroup.className += ' right';
      
      // 创建消息气泡
      const messageBubble = document.createElement('div');
      messageBubble.className = 'message message-sent';
      
      // 创建消息内容元素
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      contentDiv.innerHTML = safeContent;
      
      // 如果是图片消息，添加图片加载事件处理
      if (isImageMessage) {
        const imgElement = contentDiv.querySelector('img');
        if (imgElement) {
          // 添加loading状态
          messageBubble.classList.add('loading');
          
          // 图片加载事件处理
          setupImageEvents(imgElement, messageBubble);
        }
      }
      
      messageBubble.appendChild(contentDiv);
      
      // 创建头像
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.style.backgroundColor = 'var(--primary-color)';
      avatar.textContent = currentUser.username.charAt(0).toUpperCase();
      
      // 添加头像和消息气泡
      messageGroup.appendChild(avatar);
      messageGroup.appendChild(messageBubble);
      
      // 如果是连续消息，则隐藏头像
      if (message.isConsecutive) {
        avatar.style.visibility = 'hidden';
        messageGroup.style.marginTop = '4px'; // 减小连续消息的间距
      }
    } else {
      messageGroup.className += ' left';
      
      // 获取发送者的首字母作为头像
      const senderInitial = safeUsername.charAt(0).toUpperCase();
      
      // 创建头像
      const avatar = document.createElement('div');
      avatar.className = 'user-avatar';
      avatar.style.backgroundColor = getRandomColorById(message.from);
      avatar.textContent = senderInitial;
      
      // 创建消息气泡
      const messageBubble = document.createElement('div');
      messageBubble.className = 'message message-received';
      
      // 创建消息内容元素
      const contentDiv = document.createElement('div');
      contentDiv.className = 'message-content';
      contentDiv.innerHTML = safeContent;
      
      // 图片消息处理
      if (isImageMessage) {
        const imgElement = contentDiv.querySelector('img');
        if (imgElement) {
          messageBubble.classList.add('loading');
          setupImageEvents(imgElement, messageBubble);
        }
      }
      
      messageBubble.appendChild(contentDiv);
      
      // 添加头像和消息气泡
      messageGroup.appendChild(avatar);
      messageGroup.appendChild(messageBubble);
      
      // 连续消息处理
      if (message.isConsecutive) {
        avatar.style.visibility = 'hidden';
        messageGroup.style.marginTop = '4px';
      }
    }
    
    return messageGroup;
  }
  
  // 设置图片加载事件
  function setupImageEvents(imgElement, messageBubble) {
    // 图片加载完成时的处理
    imgElement.onload = function() {
      messageBubble.classList.remove('loading');
    };
    
    // 图片加载失败时的处理
    imgElement.onerror = function() {
      messageBubble.classList.remove('loading');
      this.style.display = 'none';
      messageBubble.querySelector('.message-content').innerHTML += '<div class="image-error">图片加载失败</div>';
    };
  }
  
  // 侧边栏选项卡切换
  sidebarTabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // 移除所有选项卡的活动状态
      sidebarTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 设置当前选项卡为活动状态
      this.classList.add('active');
      
      // 显示对应的内容区域
      const tabName = this.dataset.tab;
      document.getElementById(`${tabName}Tab`).classList.add('active');
    });
  });
  
  // 添加好友按钮点击事件
  addFriendButton.addEventListener('click', function() {
    // 打开添加好友模态框
    addFriendModal.style.display = 'flex';
    searchUserInput.value = '';
    searchResults.innerHTML = '';
    searchUserInput.focus();
  });
  
  // 关闭添加好友模态框
  closeAddFriendModal.addEventListener('click', function() {
    addFriendModal.style.display = 'none';
  });
  
  // 点击模态框外部关闭
  addFriendModal.addEventListener('click', function(e) {
    if (e.target === addFriendModal) {
      addFriendModal.style.display = 'none';
    }
  });
  
  // 搜索用户按钮点击事件
  searchUserButton.addEventListener('click', searchUsers);
  
  // 搜索输入框按Enter键搜索
  searchUserInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchUsers();
    }
  });
  
  // 搜索用户
  function searchUsers() {
    const keyword = searchUserInput.value.trim();
    if (!keyword) {
      showToast('请输入搜索关键词', 'error');
      return;
    }
    
    // 发送搜索请求
    ipcRenderer.send('search-users', { keyword });
  }
  
  // 监听搜索用户结果
  ipcRenderer.on('search-users-response', function(event, response) {
    searchResults.innerHTML = '';
    
    if (response.users && response.users.length > 0) {
      response.users.forEach(user => {
        // 不显示自己
        if (user.id === currentUser.id) return;
        
        const userItem = document.createElement('div');
        userItem.className = 'search-result-item';
        
        const isFriend = user.isFriend;
        const isPending = user.isPending;
        
        userItem.innerHTML = `
          <div class="user-avatar" style="background-color: ${getRandomColor()}">${user.username.charAt(0).toUpperCase()}</div>
          <div class="user-name">${user.username}</div>
          ${isFriend ? 
            '<button class="add-button" disabled>已是好友</button>' : 
            (isPending ? 
              '<button class="add-button" disabled>请求已发送</button>' : 
              `<button class="add-button" data-userid="${user.id}">添加好友</button>`
            )
          }
        `;
        
        searchResults.appendChild(userItem);
      });
      
      // 添加好友按钮点击事件
      const addButtons = searchResults.querySelectorAll('.add-button:not([disabled])');
      addButtons.forEach(button => {
        button.addEventListener('click', function() {
          const userId = this.dataset.userid;
          sendFriendRequest(userId);
          this.disabled = true;
          this.textContent = '请求已发送';
        });
      });
    } else {
      searchResults.innerHTML = '<div class="tab-empty">未找到匹配的用户</div>';
    }
  });
  
  // 发送好友请求
  function sendFriendRequest(userId) {
    ipcRenderer.send('send-friend-request', { userId });
  }
  
  // 监听好友列表
  ipcRenderer.on('friend-list', function(event, friends) {
    // 清空好友列表
    friendList.innerHTML = '';
    
    if (friends && friends.length > 0) {
      friends.forEach(friend => {
        const friendItem = document.createElement('li');
        friendItem.className = 'user-item';
        friendItem.dataset.userid = friend.id;
        
        friendItem.innerHTML = `
          <div class="user-avatar" style="background-color: ${getRandomColor()}">${friend.username.charAt(0).toUpperCase()}</div>
          <div class="user-name">${friend.username}</div>
          <div class="user-status ${friend.online ? 'online' : 'offline'}"></div>
        `;
        
        // 添加好友点击事件，切换到私聊
        friendItem.addEventListener('click', function() {
          // 添加到聊天列表（如果不存在）
          let existingChatItem = Array.from(chatList.children).find(item => item.dataset.userid === friend.id);
          if (!existingChatItem) {
            const currentTime = Date.now();
            const chatItem = document.createElement('li');
            chatItem.className = 'user-item';
            chatItem.dataset.userid = friend.id;
            chatItem.dataset.lasttimestamp = currentTime;
            
            chatItem.innerHTML = `
              <div class="user-avatar" style="background-color: ${getRandomColor()}">${friend.username.charAt(0).toUpperCase()}</div>
              <div class="chat-info">
                <div class="user-name">${friend.username}</div>
                <div class="last-message">暂无消息</div>
              </div>
              <div class="chat-meta">
                <div class="time-stamp">${formatRelativeTime(currentTime)}</div>
              </div>
            `;
            
            // 添加到列表顶部（除群聊外）
            const groupChat = chatList.querySelector('li[data-userid="all"]');
            chatList.insertBefore(chatItem, groupChat.nextSibling);
          }
          
          // 切换到聊天界面
          sidebarTabs[0].click();
          
          // 切换到对应的聊天
          switchChat(friend.id, friend.username);
        });
        
        friendList.appendChild(friendItem);
      });
    } else {
      friendList.innerHTML = '<div class="tab-empty">暂无好友，点击添加好友按钮开始添加</div>';
    }
  });
  
  // 监听待处理的好友请求
  ipcRenderer.on('pending-friend-requests', function(event, requests) {
    pendingRequests = requests;
    
    // 更新请求标记
    updateRequestsBadge();
    
    // 更新好友请求列表
    updateFriendRequestsList();
  });
  
  // 监听新的好友请求
  ipcRenderer.on('friend-request', function(event, request) {
    pendingRequests.push(request);
    
    // 更新请求标记
    updateRequestsBadge();
    
    // 更新好友请求列表
    updateFriendRequestsList();
    
    // 显示通知
    showToast(`收到来自 ${request.fromUsername} 的好友请求`, 'info');
  });
  
  // 监听好友请求被接受
  ipcRenderer.on('friend-request-accepted', function(event, data) {
    showToast(`${data.friend.username} 接受了你的好友请求`, 'success');
    
    // 添加到好友列表
    ipcRenderer.send('get-friends');
  });
  
  // 监听好友上线
  ipcRenderer.on('friend-online', function(event, friend) {
    showToast(`好友 ${friend.username} 已上线`, 'info');
    
    // 更新好友列表中的在线状态
    const friendItems = friendList.querySelectorAll('.user-item');
    friendItems.forEach(item => {
      if (item.dataset.userid === friend.id) {
        const statusEl = item.querySelector('.user-status');
        if (statusEl) {
          statusEl.className = 'user-status online';
        }
      }
    });
  });
  
  // 监听好友下线
  ipcRenderer.on('friend-offline', function(event, friend) {
    // 更新好友列表中的在线状态
    const friendItems = friendList.querySelectorAll('.user-item');
    friendItems.forEach(item => {
      if (item.dataset.userid === friend.id) {
        const statusEl = item.querySelector('.user-status');
        if (statusEl) {
          statusEl.className = 'user-status offline';
        }
      }
    });
  });
  
  // 更新好友请求标记
  function updateRequestsBadge() {
    const count = pendingRequests.length;
    if (count > 0) {
      requestsBadge.textContent = count;
      requestsBadge.style.display = 'inline-block';
    } else {
      requestsBadge.style.display = 'none';
    }
  }
  
  // 更新好友请求列表
  function updateFriendRequestsList() {
    friendRequests.innerHTML = '';
    
    if (pendingRequests.length > 0) {
      pendingRequests.forEach(request => {
        const requestItem = document.createElement('div');
        requestItem.className = 'friend-request-item';
        requestItem.dataset.requestid = request.id;
        
        // 获取名字的第一个字符，用于头像
        const firstChar = request.fromUsername ? request.fromUsername.charAt(0).toUpperCase() : '?';
        
        requestItem.innerHTML = `
          <div class="user-avatar" style="background-color: ${getRandomColor()}">${firstChar}</div>
          <div class="user-info">
            <div class="user-name">${request.fromUsername}</div>
            <div class="request-time">请求时间: ${new Date(request.createdAt).toLocaleString()}</div>
          </div>
          <div class="friend-request-buttons">
            <button class="friend-request-button accept" data-requestid="${request.id}">接受</button>
            <button class="friend-request-button reject" data-requestid="${request.id}">拒绝</button>
          </div>
        `;
        
        friendRequests.appendChild(requestItem);
      });
      
      // 添加接受和拒绝按钮的事件处理
      const acceptButtons = friendRequests.querySelectorAll('.friend-request-button.accept');
      const rejectButtons = friendRequests.querySelectorAll('.friend-request-button.reject');
      
      acceptButtons.forEach(button => {
        button.addEventListener('click', function() {
          const requestId = this.dataset.requestid;
          respondToFriendRequest(requestId, true);
        });
      });
      
      rejectButtons.forEach(button => {
        button.addEventListener('click', function() {
          const requestId = this.dataset.requestid;
          respondToFriendRequest(requestId, false);
        });
      });
    } else {
      friendRequests.innerHTML = '<div class="tab-empty">暂无待处理的好友请求</div>';
    }
  }
  
  // 响应好友请求
  function respondToFriendRequest(requestId, accept) {
    ipcRenderer.send('respond-friend-request', { requestId, accept });
    
    // 从待处理列表中移除
    pendingRequests = pendingRequests.filter(request => request.id !== requestId);
    
    // 更新请求标记
    updateRequestsBadge();
    
    // 更新好友请求列表
    updateFriendRequestsList();
    
    // 如果接受，则刷新好友列表
    if (accept) {
      ipcRenderer.send('get-friends');
    }
  }
  
  // 自动登录
  function autoLogin() {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData && userData.token) {
          ipcRenderer.send('auto-login', userData);
        }
      } catch (error) {
        console.error('自动登录失败:', error);
        localStorage.removeItem('user');
      }
    }
  }
  
  // 生成随机颜色
  function getRandomColor() {
    const colors = [
      '#e74c3c', '#9b59b6', '#3498db', '#2ecc71', '#1abc9c',
      '#f1c40f', '#e67e22', '#d35400', '#bdc3c7', '#7f8c8d'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
  
  // 应用启动时尝试自动登录
  autoLogin();
  
  // 获取待处理的好友请求
  ipcRenderer.on('get-pending-requests', function() {
    ipcRenderer.send('get-pending-requests');
  });
  
  // 在登录成功后获取好友列表
  ipcRenderer.on('get-friends', function() {
    ipcRenderer.send('get-friends');
  });
  
  // 初始化聊天列表，确保只有群聊
  function initChatList() {
    // 先保存现有的非群聊聊天项
    const existingChats = Array.from(chatList.querySelectorAll('.user-item')).filter(item => item.dataset.userid !== 'all');
    
    // 清空聊天列表
    chatList.innerHTML = '';
    
    // 添加群聊选项 - 使用存储在本地的最后消息时间，如果没有则使用当前时间
    const groupChatTimestamp = localStorage.getItem('groupChatLastTime') || Date.now();
    
    const groupChatItem = document.createElement('li');
    groupChatItem.className = 'user-item active';
    groupChatItem.dataset.userid = 'all';
    groupChatItem.dataset.lasttimestamp = groupChatTimestamp;
    
    groupChatItem.innerHTML = `
      <div class="user-avatar" style="background-color: #3498db">群</div>
      <div class="chat-info">
        <div class="user-name">群聊</div>
        <div class="last-message">所有人的聊天室</div>
      </div>
      <div class="chat-meta">
        <div class="time-stamp">${formatRelativeTime(parseInt(groupChatTimestamp))}</div>
      </div>
    `;
    
    chatList.appendChild(groupChatItem);
    
    // 按时间戳排序已有的聊天项
    existingChats.sort((a, b) => {
      const timeA = parseInt(a.dataset.lasttimestamp) || 0;
      const timeB = parseInt(b.dataset.lasttimestamp) || 0;
      return timeB - timeA; // 降序排列，最新的在前面
    });
    
    // 恢复保存的聊天项，但移除关闭按钮
    existingChats.forEach(chat => {
      // 如果旧格式，更新为新格式
      if (!chat.querySelector('.chat-info')) {
        const userId = chat.dataset.userid;
        const userName = chat.querySelector('.user-name').textContent;
        const avatar = chat.querySelector('.user-avatar').cloneNode(true);
        const unreadBadge = chat.querySelector('.unread-badge');
        const timestamp = chat.dataset.lasttimestamp || Date.now();
        
        // 创建新的聊天项
        const newChat = document.createElement('li');
        newChat.className = 'user-item';
        newChat.dataset.userid = userId;
        newChat.dataset.lasttimestamp = timestamp;
        
        // 设置HTML内容
        newChat.innerHTML = `
          <div class="chat-info">
            <div class="user-name">${userName}</div>
            <div class="last-message">暂无消息</div>
          </div>
          <div class="chat-meta">
            <div class="time-stamp">${formatRelativeTime(parseInt(timestamp))}</div>
          </div>
        `;
        
        // 插入头像元素
        newChat.insertBefore(avatar, newChat.firstChild);
        
        // 如果有未读消息，添加未读标记
        if (unreadBadge && unreadBadge.style.display !== 'none') {
          const newBadge = document.createElement('div');
          newBadge.className = 'unread-badge';
          newBadge.textContent = unreadBadge.textContent;
          newChat.querySelector('.chat-meta').appendChild(newBadge);
        }
        
        chatList.appendChild(newChat);
      } else {
        // 更新现有的时间戳显示
        const timestamp = chat.dataset.lasttimestamp || Date.now();
        const timeStampEl = chat.querySelector('.time-stamp');
        if (timeStampEl) {
          timeStampEl.textContent = formatRelativeTime(parseInt(timestamp));
        }
        
        chatList.appendChild(chat);
      }
    });
    
    // 默认选中群聊
    switchChat('all', '群聊');
  }
});