/**
 * UI加载器 - 负责加载UI界面和管理界面切换
 */
const { renderTemplate } = require('./templates');
const eventHandler = require('./event-handler');

/**
 * 界面状态枚举
 */
const UIState = {
  LOADING: 'loading',
  LOGIN: 'login',
  REGISTER: 'register',
  CHAT: 'chat'
};

/**
 * 当前UI状态
 */
let currentState = UIState.LOADING;

/**
 * 切换到登录界面
 */
async function showLoginUI() {
  const mainContainer = document.getElementById('main-container');
  await renderTemplate('login', mainContainer);
  currentState = UIState.LOGIN;
  
  // 设置登录相关的事件监听
  setupLoginEvents();
}

/**
 * 切换到聊天界面
 */
async function showChatUI() {
  const mainContainer = document.getElementById('main-container');
  
  // 加载侧边栏
  const sidebarHtml = await loadTemplate('sidebar');
  
  // 加载聊天界面
  const chatContainerHtml = await loadTemplate('chatContainer');
  
  // 组合侧边栏和聊天界面
  mainContainer.innerHTML = `
    <div id="chatPanel" style="display: grid;">
      ${sidebarHtml}
      ${chatContainerHtml}
    </div>
  `;
  
  currentState = UIState.CHAT;
  
  // 设置聊天相关的事件监听
  eventHandler.setupChatEvents();
}

/**
 * 设置登录界面事件
 */
function setupLoginEvents() {
  // 设置窗口控制按钮事件
  eventHandler.setupWindowControlEvents();
  
  const loginButton = document.getElementById('loginButton');
  const registerButton = document.getElementById('registerButton');
  const switchToRegisterButton = document.getElementById('switchToRegister');
  const switchToLoginButton = document.getElementById('switchToLogin');
  
  if (loginButton) {
    loginButton.addEventListener('click', window.handleLogin);
  }
  
  if (registerButton) {
    registerButton.addEventListener('click', window.handleRegister);
  }
  
  if (switchToRegisterButton) {
    switchToRegisterButton.addEventListener('click', window.showRegisterPanel);
  }
  
  if (switchToLoginButton) {
    switchToLoginButton.addEventListener('click', window.showLoginPanel);
  }
}

/**
 * 显示登录面板
 */
function showLoginPanel() {
  const loginPanel = document.getElementById('loginPanel');
  const registerPanel = document.getElementById('registerPanel');
  
  if (loginPanel && registerPanel) {
    registerPanel.style.display = 'none';
    loginPanel.style.display = 'flex';
    currentState = UIState.LOGIN;
  }
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
    currentState = UIState.REGISTER;
  }
}

/**
 * 处理选项卡切换
 * @param {Event} event 事件对象
 */
function handleTabChange(event) {
  const tab = event.currentTarget;
  const tabName = tab.dataset.tab;
  
  // 移除所有选项卡的active类
  document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
  
  // 隐藏所有内容面板
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  
  // 激活当前选项卡
  tab.classList.add('active');
  
  // 显示对应的内容面板
  const contentPanel = document.getElementById(`${tabName}Tab`);
  if (contentPanel) {
    contentPanel.classList.add('active');
  }
}

/**
 * 初始化UI
 */
async function initUI() {
  // 加载模态框
  const modalsContainer = document.getElementById('modals-container');
  await renderTemplate('modals', modalsContainer);
  
  // 默认显示登录界面
  await showLoginUI();
  
  // 显示应用
  document.getElementById('loading-container').style.display = 'none';
  document.getElementById('app').style.display = 'block';
}

/**
 * 从模板缓存加载模板
 * @param {string} templateName 模板名称
 * @returns {Promise<string>} 模板HTML
 */
async function loadTemplate(templateName) {
  return require('./templates').loadTemplate(templateName);
}

module.exports = {
  UIState,
  currentState,
  showLoginUI,
  showChatUI,
  initUI
}; 