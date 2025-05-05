/**
 * 渲染进程脚本 - 处理UI交互
 */

const { ipcRenderer } = require('electron');
const { initTemplates } = require('./js/templates');
const { initUI, showLoginUI, showChatUI } = require('./js/ui-loader');
const { showToast } = require('./js/utils');
const userService = require('./js/services/user-service');
const chatService = require('./js/services/chat-service');
const avatarManager = require('./js/avatar-manager');

// 设置窗口圆角样式
function setupWindowStyle() {
  // 添加圆角样式到HTML和body
  document.documentElement.style.borderRadius = '10px';
  document.body.style.borderRadius = '10px';
  
  // 确保所有主容器都有圆角
  const containers = [
    document.getElementById('app'),
    document.getElementById('main-container'),
    document.getElementById('loginPanel')
  ];
  
  containers.forEach(container => {
    if (container) {
      container.style.borderRadius = '10px';
      container.style.overflow = 'hidden';
      }
    });
  }
  
// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // 初始化模板系统
    await initTemplates();
    
    // 初始化UI
    await initUI();
    
    // 设置窗口样式
    setupWindowStyle();
    
    // 自动登录 (如果有保存的登录信息)
    autoLogin();
  } catch (error) {
    console.error('初始化应用失败:', error);
    showToast('初始化应用失败，请刷新页面重试', 'error');
  }
});

/**
 * 尝试自动登录
 */
function autoLogin() {
  // 从本地存储获取登录信息
  const savedUser = localStorage.getItem('currentUser');
  
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser);
      // 发送自动登录请求
      ipcRenderer.send('auto-login', userData);
    } catch (e) {
      console.error('自动登录失败:', e);
      localStorage.removeItem('currentUser');
    }
  }
}

/**
 * 处理登录
 */
function handleLogin() {
  const username = document.getElementById('usernameInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  
  if (!username || !password) {
    showToast('用户名和密码不能为空', 'error');
    return;
  }
  
  // 发送登录请求
  ipcRenderer.send('login-user', { username, password });
}

/**
 * 处理注册
 */
function handleRegister() {
  const username = document.getElementById('registerUsernameInput').value.trim();
  const password = document.getElementById('registerPasswordInput').value;
  const confirmPassword = document.getElementById('registerPasswordConfirmInput').value;
    
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
}

/**
 * 切换到登录面板
 */
function showLoginPanel() {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  
  if (loginPanel && registerPanel) {
    registerPanel.style.display = 'none';
    loginPanel.style.display = 'flex';
  }
}

/**
 * 切换到注册面板
 */
function showRegisterPanel() {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  
  if (loginPanel && registerPanel) {
    loginPanel.style.display = 'none';
    registerPanel.style.display = 'flex';
  }
}

// 登录响应处理
ipcRenderer.on('login-response', (event, response) => {
  if (response.success) {
    // 保存登录信息
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    
    // 切换到聊天界面
    showChatUI();
    
    // 更新用户信息
    updateUserInfo(response.user);
    
    // 初始化聊天界面
    initChatInterface();
      } else {
    showToast(response.message || '登录失败', 'error');
  }
});

// 注册响应处理
ipcRenderer.on('register-response', (event, response) => {
    if (response.success) {
    showToast('注册成功，请登录', 'success');
    
    // 切换到登录面板
    showLoginPanel();
    
    // 自动填充用户名
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
      usernameInput.value = document.getElementById('registerUsernameInput').value;
    }
    } else {
      showToast(response.message || '注册失败', 'error');
    }
  });
  
/**
 * 更新用户信息显示
 * @param {Object} user 用户数据
 */
function updateUserInfo(user) {
  const currentUserAvatar = document.getElementById('currentUserAvatar');
  const currentUsername = document.getElementById('currentUsername');
  
  if (currentUsername) {
    currentUsername.textContent = user.username;
  }
  
  if (currentUserAvatar) {
    // 如果有自定义头像数据，使用它
    if (user.avatarData) {
      avatarManager.updateAvatarUI(user.avatarData);
    } else {
      // 否则使用默认字母头像
      currentUserAvatar.textContent = user.username.charAt(0).toUpperCase();
      currentUserAvatar.style.backgroundColor = getRandomColorById(user.id);
    }
  }
}

/**
 * 初始化聊天界面
 */
function initChatInterface() {
  // 加载聊天列表
  loadChatList();
  
  // 加载好友列表
  userService.loadFriendList();
  
  // 加载好友请求
  userService.loadFriendRequests();
  
  // 初始化头像选择器
  console.log('准备初始化头像选择器...');
  
  // 确保元素已经存在
  setTimeout(() => {
    console.log('延时初始化头像选择器...');
    avatarManager.initAvatarSelector();
  }, 500);
  
  // 切换到群聊
  chatService.switchToGroupChat();
}

/**
 * 加载聊天列表
 */
function loadChatList() {
  ipcRenderer.send('get-chat-list');
}

// 自动登录响应处理
ipcRenderer.on('auto-login-response', (event, response) => {
  if (response.success) {
    const userData = JSON.parse(localStorage.getItem('currentUser'));
          
          // 切换到聊天界面
    showChatUI();
          
    // 更新用户信息
    updateUserInfo(userData);
        
    // 初始化聊天界面
    initChatInterface();
    } else {
    // 自动登录失败，显示登录界面
    localStorage.removeItem('currentUser');
  }
});

// 处理用户数据更新
ipcRenderer.on('update-local-user', (event, userData) => {
  if (userData) {
    console.log('收到更新的用户数据，正在更新本地存储...');
    // 更新本地存储的用户数据
    localStorage.setItem('currentUser', JSON.stringify(userData));
    
    // 更新UI显示
    updateUserInfo(userData);
  }
});

// 公开全局函数以供HTML调用
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.showLoginPanel = showLoginPanel;
window.showRegisterPanel = showRegisterPanel;
window.sendMessage = chatService.sendMessage;
window.loadMoreMessages = chatService.loadMoreMessages;
window.sendFriendRequest = userService.sendFriendRequest;
window.respondToFriendRequest = userService.respondToFriendRequest;
window.searchUsers = userService.searchUsers;
window.showAvatar = avatarManager.showAvatarModal;

// 从utils.js导入必要的函数
const { getRandomColorById } = require('./js/utils'); 