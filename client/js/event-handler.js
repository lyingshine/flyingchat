/**
 * 事件处理模块 - 负责处理DOM事件
 */
const { throttle, debounce } = require('./utils');
const chatService = require('./services/chat-service');
const messageRenderer = require('./message-renderer');
const { ipcRenderer } = require('electron');

/**
 * 设置窗口控制按钮事件
 */
function setupWindowControlEvents() {
  const minimizeButton = document.getElementById('minimizeButton');
  const maximizeButton = document.getElementById('maximizeButton');
  const closeButton = document.getElementById('closeButton');
  
  if (minimizeButton) {
    minimizeButton.addEventListener('click', () => {
      ipcRenderer.send('window-minimize');
    });
  }
  
  if (maximizeButton) {
    maximizeButton.addEventListener('click', () => {
      ipcRenderer.send('window-maximize');
    });
  }
  
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      ipcRenderer.send('window-close');
    });
  }
}

/**
 * 设置消息输入框事件
 */
function setupMessageInputEvents() {
  const messageInput = document.getElementById('messageInput');
  const sendButton = document.getElementById('sendButton');
  
  if (!messageInput || !sendButton) return;
  
  // 发送按钮点击事件
  sendButton.addEventListener('click', () => {
    sendMessage();
  });
  
  // 输入框回车事件
  messageInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  });
  
  // 输入框自动调整高度
  messageInput.addEventListener('input', throttle(function() {
    autoResizeTextarea(this);
  }, 100));
}

/**
 * 发送消息
 */
function sendMessage() {
  const messageInput = document.getElementById('messageInput');
  if (!messageInput) return;
  
  const content = messageInput.value.trim();
  if (!content) return;
  
  chatService.sendMessage(content, 'text');
}

/**
 * 自动调整文本框高度
 * @param {HTMLTextAreaElement} textarea 文本域元素
 */
function autoResizeTextarea(textarea) {
  if (!textarea) return;
  
  // 保存当前滚动位置
  const scrollPos = textarea.scrollTop;
  
  // 重置高度
  textarea.style.height = 'auto';
  
  // 计算新高度，最大120px
  const newHeight = Math.min(textarea.scrollHeight, 120);
  textarea.style.height = `${newHeight}px`;
  
  // 恢复滚动位置
  textarea.scrollTop = scrollPos;
}

/**
 * 设置聊天界面事件
 */
function setupChatEvents() {
  // 设置窗口控制按钮事件
  setupWindowControlEvents();
  
  // 设置消息输入框事件
  setupMessageInputEvents();
  
  // 设置加载更多按钮事件
  const loadMoreButton = document.getElementById('loadMoreMessages');
  if (loadMoreButton) {
    loadMoreButton.addEventListener('click', chatService.loadMoreMessages);
  }
  
  // 设置图片上传按钮事件
  const imageUploadButton = document.getElementById('imageUploadButton');
  const imageFileInput = document.getElementById('imageFileInput');
  
  if (imageUploadButton && imageFileInput) {
    imageUploadButton.addEventListener('click', () => {
      imageFileInput.click();
    });
    
    imageFileInput.addEventListener('change', handleImageUpload);
  }
  
  // 设置侧边栏标签切换事件
  const sidebarTabs = document.querySelectorAll('.sidebar-tab');
  if (sidebarTabs.length) {
    sidebarTabs.forEach(tab => {
      tab.addEventListener('click', handleTabChange);
    });
  }
  
  // 设置搜索输入框事件
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(function() {
      const keyword = this.value.trim();
      if (keyword.length >= 2) {
        window.searchUsers(keyword);
      }
    }, 500));
  }
}

/**
 * 处理标签切换
 * @param {Event} event 事件对象
 */
function handleTabChange(event) {
  const tab = event.currentTarget;
  const tabId = tab.dataset.tab;
  
  // 移除所有标签的活跃状态
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // 设置当前标签为活跃
  tab.classList.add('active');
  
  // 隐藏所有内容面板
  document.querySelectorAll('.tab-content').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // 显示对应的内容面板
  const targetPanel = document.getElementById(`${tabId}Tab`);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
}

/**
 * 处理图片上传
 * @param {Event} event 事件对象
 */
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 验证文件类型
  if (!file.type.match('image.*')) {
    alert('请选择图片文件');
    return;
  }
  
  // 验证文件大小 (最大5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('图片大小不能超过5MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const imageData = e.target.result;
    chatService.sendMessage(imageData, 'image');
  };
  
  reader.readAsDataURL(file);
  
  // 清空文件输入框，允许再次选择相同文件
  event.target.value = '';
}

/**
 * 设置图片预览关闭事件
 */
function setupImagePreviewEvents() {
  const closeButtons = document.querySelectorAll('.image-preview-container .close-button');
  if (closeButtons.length) {
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const previewContainer = button.closest('.modal-overlay');
        if (previewContainer) {
          document.body.removeChild(previewContainer);
        }
      });
    });
  }
  
  // 点击背景关闭
  const modalOverlays = document.querySelectorAll('.modal-overlay');
  if (modalOverlays.length) {
    modalOverlays.forEach(overlay => {
      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) {
          document.body.removeChild(overlay);
        }
      });
    });
  }
}

/**
 * 设置登录界面事件
 */
function setupLoginEvents() {
  // 设置窗口控制按钮事件
  setupWindowControlEvents();
  
  // 其他登录相关事件...
}

module.exports = {
  setupChatEvents,
  setupMessageInputEvents,
  setupImagePreviewEvents,
  setupLoginEvents,
  setupWindowControlEvents,
  handleTabChange,
  handleImageUpload
}; 