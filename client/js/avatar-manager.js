/**
 * 头像管理器 - 负责处理用户头像相关功能
 */
const { ipcRenderer } = require('electron');
const { showToast } = require('./utils');

// 存储当前选择的头像数据
let currentAvatarData = {
  type: 'letter', // 'letter', 'color', 'image'
  color: null,
  imageData: null
};

/**
 * 初始化头像选择器
 */
function initAvatarSelector() {
  console.log('正在初始化头像选择器...');
  const userAvatar = document.getElementById('currentUserAvatar');
  console.log('头像元素存在?', !!userAvatar);
  
  if (userAvatar) {
    console.log('正在添加头像点击事件监听...');
    
    // 确保鼠标指针显示为可点击状态
    userAvatar.style.cursor = 'pointer';
    
    // 添加点击事件
    userAvatar.addEventListener('click', function(e) {
      console.log('头像被点击了!');
      e.preventDefault();
      e.stopPropagation();
      
      // 直接调用显示模态框函数
      showAvatarModal();
    });
  } else {
    console.error('找不到头像元素!');
  }
  
  // 设置模态框事件
  setupAvatarModalEvents();
  
  // 暴露全局方法以便调试
  window.showAvatarModal = showAvatarModal;
}

/**
 * 设置头像选择器模态框事件
 */
function setupAvatarModalEvents() {
  console.log('设置头像模态框事件...');
  let modal = document.getElementById('avatarModal');
  
  // 如果找不到模态框，先检查DOM中是否有avatarModal内容被隐藏或改名
  if (!modal) {
    console.log('尝试查找其他可能的avatarModal元素...');
    // 尝试通过类名查找
    const possibleModals = document.querySelectorAll('.modal-overlay');
    for (const possibleModal of possibleModals) {
      console.log('发现可能的模态框元素:', possibleModal.id || '无ID');
      if (possibleModal.querySelector('h3') && 
          possibleModal.querySelector('h3').textContent.includes('更换头像')) {
        console.log('找到包含"更换头像"的模态框，使用它');
        possibleModal.id = 'avatarModal';
        modal = possibleModal;
        break;
      }
    }
  }
  
  // 如果仍然找不到模态框，尝试创建一个新的
  if (!modal) {
    console.log('尝试创建新的头像模态框...');
    const modalsContainer = document.getElementById('modals-container');
    
    if (!modalsContainer) {
      console.error('找不到模态框容器，无法创建头像模态框!');
      return;
    }
    
    const modalHTML = `
    <!-- 头像选择模态框 -->
    <div id="avatarModal" class="modal-overlay" style="display: none;">
      <div class="modal-container">
        <div class="modal-header">
          <h3>更换头像</h3>
          <button id="closeAvatarModal" class="close-button">&times;</button>
        </div>
        <div class="modal-body">
          <div class="avatar-preview-container">
            <div id="avatarPreview" class="avatar-preview">预览区</div>
          </div>
          <div class="avatar-options">
            <div class="avatar-section">
              <h4>上传图片</h4>
              <button id="uploadAvatarButton" class="button">选择图片</button>
              <input type="file" id="avatarFileInput" accept="image/*" style="display: none;">
            </div>
            <div class="avatar-section">
              <h4>选择颜色</h4>
              <div class="avatar-colors">
                <div class="avatar-color" data-color="#1abc9c" style="background-color: #1abc9c;"></div>
                <div class="avatar-color" data-color="#2ecc71" style="background-color: #2ecc71;"></div>
                <div class="avatar-color" data-color="#3498db" style="background-color: #3498db;"></div>
                <div class="avatar-color" data-color="#9b59b6" style="background-color: #9b59b6;"></div>
                <div class="avatar-color" data-color="#e74c3c" style="background-color: #e74c3c;"></div>
                <div class="avatar-color" data-color="#f39c12" style="background-color: #f39c12;"></div>
                <div class="avatar-color" data-color="#16a085" style="background-color: #16a085;"></div>
                <div class="avatar-color" data-color="#27ae60" style="background-color: #27ae60;"></div>
                <div class="avatar-color" data-color="#2980b9" style="background-color: #2980b9;"></div>
                <div class="avatar-color" data-color="#8e44ad" style="background-color: #8e44ad;"></div>
                <div class="avatar-color" data-color="#c0392b" style="background-color: #c0392b;"></div>
                <div class="avatar-color" data-color="#d35400" style="background-color: #d35400;"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button id="cancelAvatarButton" class="button button-secondary">取消</button>
          <button id="saveAvatarButton" class="button">保存</button>
        </div>
      </div>
    </div>
    `;
    
    modalsContainer.insertAdjacentHTML('beforeend', modalHTML);
    console.log('创建了新的头像模态框');
    
    // 获取新创建的模态框
    modal = document.getElementById('avatarModal');
  }
  
  if (!modal) {
    console.error('即使尝试创建，依然找不到头像模态框，放弃设置事件!');
    return;
  }
  
  console.log('找到头像模态框，开始设置事件...');
  
  // 获取模态框中的元素 - 使用modal作为基准查找元素
  const closeButton = modal.querySelector('#closeAvatarModal');
  const saveButton = modal.querySelector('#saveAvatarButton');
  const cancelButton = modal.querySelector('#cancelAvatarButton');
  const uploadButton = modal.querySelector('#uploadAvatarButton');
  const fileInput = modal.querySelector('#avatarFileInput');
  const colorItems = modal.querySelectorAll('.avatar-color');
  
  console.log('关闭按钮存在?', !!closeButton);
  console.log('保存按钮存在?', !!saveButton);
  console.log('取消按钮存在?', !!cancelButton);
  console.log('上传按钮存在?', !!uploadButton);
  console.log('文件输入存在?', !!fileInput);
  console.log('颜色选项数量:', colorItems.length);
  
  // 关闭按钮事件
  if (closeButton) {
    closeButton.addEventListener('click', function() {
      console.log('关闭按钮被点击');
      hideAvatarModal();
    });
  }
  
  if (cancelButton) {
    cancelButton.addEventListener('click', function() {
      console.log('取消按钮被点击');
      hideAvatarModal();
    });
  }
  
  // 保存按钮事件
  if (saveButton) {
    saveButton.addEventListener('click', function() {
      console.log('保存按钮被点击');
      saveAvatar();
    });
  }
  
  // 上传按钮事件
  if (uploadButton && fileInput) {
    uploadButton.addEventListener('click', function() {
      console.log('上传按钮被点击');
      fileInput.click();
    });
    
    fileInput.addEventListener('change', handleAvatarFileSelect);
  }
  
  // 颜色选择事件
  if (colorItems.length) {
    colorItems.forEach(item => {
      item.addEventListener('click', function() {
        console.log('颜色选项被点击:', this.dataset.color);
        
        // 移除其他选中状态
        colorItems.forEach(i => i.classList.remove('selected'));
        
        // 添加选中状态
        this.classList.add('selected');
        
        // 更新当前选择
        currentAvatarData = {
          type: 'color',
          color: this.dataset.color,
          imageData: null
        };
        
        // 更新预览
        updateAvatarPreview();
      });
    });
  }
  
  // 直接点击模态框背景关闭
  modal.addEventListener('click', function(event) {
    if (event.target === this) {
      console.log('模态框背景被点击');
      hideAvatarModal();
    }
  });
}

/**
 * 处理头像文件选择
 * @param {Event} event 事件对象
 */
function handleAvatarFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 检查文件类型
  if (!file.type.match('image.*')) {
    showToast('请选择图片文件', 'error');
    return;
  }
  
  // 检查文件大小（最大2MB）
  if (file.size > 2 * 1024 * 1024) {
    showToast('图片大小不能超过2MB', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    // 更新当前选择
    currentAvatarData = {
      type: 'image',
      color: null,
      imageData: e.target.result
    };
    
    // 更新预览
    updateAvatarPreview();
  };
  
  reader.readAsDataURL(file);
}

/**
 * 更新头像预览
 */
function updateAvatarPreview() {
  const modal = document.getElementById('avatarModal');
  const preview = modal ? modal.querySelector('#avatarPreview') : document.getElementById('avatarPreview');
  
  if (!preview) {
    console.error('找不到头像预览元素!');
    return;
  }
  
  // 清空预览
  preview.innerHTML = '';
  preview.style.backgroundColor = '';
  
  if (currentAvatarData.type === 'image' && currentAvatarData.imageData) {
    // 显示图片预览
    const img = document.createElement('img');
    img.src = currentAvatarData.imageData;
    preview.appendChild(img);
  } else if (currentAvatarData.type === 'color' && currentAvatarData.color) {
    // 显示颜色预览
    preview.style.backgroundColor = currentAvatarData.color;
    
    // 获取当前用户信息
    const userData = JSON.parse(localStorage.getItem('currentUser'));
    if (userData && userData.username) {
      preview.textContent = userData.username.charAt(0).toUpperCase();
    }
  } else {
    // 默认显示
    preview.textContent = '预览区';
  }
}

/**
 * 显示头像选择器模态框
 */
function showAvatarModal() {
  console.log('显示头像选择器被调用...');
  
  // 先尝试找到模态框
  let modal = document.getElementById('avatarModal');
  console.log('头像模态框存在?', !!modal);
  
  // 如果找不到，先创建它
  if (!modal) {
    console.log('模态框不存在，将调用setupAvatarModalEvents创建');
    // setupAvatarModalEvents会检查并创建模态框
    setupAvatarModalEvents();
    
    // 再次尝试获取
    modal = document.getElementById('avatarModal');
    
    if (!modal) {
      console.error('无法创建或找到头像模态框!');
      showToast('无法显示头像选择器', 'error');
      return;
    }
  }
  
  // 确保正确的显示样式
  console.log('设置模态框显示样式...');
  modal.style.display = 'flex';
  
  // 重置当前选择
  const userData = JSON.parse(localStorage.getItem('currentUser'));
  if (userData) {
    // 如果用户有自定义头像，则加载
    if (userData.avatarData) {
      currentAvatarData = userData.avatarData;
    } else {
      // 默认使用字母头像
      currentAvatarData = {
        type: 'letter',
        color: null,
        imageData: null
      };
    }
  }
  
  // 更新预览
  updateAvatarPreview();
}

/**
 * 隐藏头像选择器模态框
 */
function hideAvatarModal() {
  console.log('隐藏头像模态框...');
  
  // 首先尝试通过ID找到模态框
  let modal = document.getElementById('avatarModal');
  
  // 如果找不到，尝试通过内容找到可能的模态框
  if (!modal) {
    console.log('通过ID找不到头像模态框，尝试通过内容查找...');
    const possibleModals = document.querySelectorAll('.modal-overlay');
    for (const possibleModal of possibleModals) {
      if (possibleModal.querySelector('h3') && 
          possibleModal.querySelector('h3').textContent.includes('更换头像')) {
        console.log('找到包含"更换头像"的模态框');
        modal = possibleModal;
        break;
      }
    }
  }
  
  if (modal) {
    modal.style.display = 'none';
    console.log('成功隐藏头像模态框');
  } else {
    console.warn('找不到头像模态框，无法隐藏');
  }
}

/**
 * 保存头像
 */
function saveAvatar() {
  // 获取当前用户
  const userData = JSON.parse(localStorage.getItem('currentUser'));
  if (!userData) {
    showToast('用户未登录', 'error');
    return;
  }
  
  // 更新用户数据
  userData.avatarData = currentAvatarData;
  
  // 保存到本地存储
  localStorage.setItem('currentUser', JSON.stringify(userData));
  
  // 发送到服务器
  ipcRenderer.send('update-avatar', {
    userId: userData.id,
    avatarData: currentAvatarData
  });
  
  // 更新UI
  updateAvatarUI(currentAvatarData);
  
  // 关闭模态框
  hideAvatarModal();
  
  // 显示提示
  showToast('头像已更新', 'success');
}

/**
 * 更新头像UI
 * @param {Object} avatarData 头像数据
 */
function updateAvatarUI(avatarData) {
  const avatar = document.getElementById('currentUserAvatar');
  if (!avatar) return;
  
  // 清空当前头像
  avatar.innerHTML = '';
  avatar.style.backgroundColor = '';
  
  // 获取当前用户信息
  const userData = JSON.parse(localStorage.getItem('currentUser'));
  if (!userData) return;
  
  if (avatarData.type === 'image' && avatarData.imageData) {
    // 显示图片头像
    const img = document.createElement('img');
    img.src = avatarData.imageData;
    avatar.appendChild(img);
  } else if (avatarData.type === 'color' && avatarData.color) {
    // 显示颜色背景 + 字母头像
    avatar.style.backgroundColor = avatarData.color;
    avatar.textContent = userData.username.charAt(0).toUpperCase();
  } else {
    // 默认显示字母头像（使用系统分配的随机颜色）
    avatar.textContent = userData.username.charAt(0).toUpperCase();
  }
}

// 服务器更新头像响应
ipcRenderer.on('avatar-updated', (event, response) => {
  if (response.success) {
    // 头像已成功保存到服务器
    showToast('头像已成功保存', 'success');
  } else {
    // 头像保存失败，但本地已更新
    showToast('头像已在本地更新，但服务器保存失败', 'warning');
  }
});

module.exports = {
  initAvatarSelector,
  updateAvatarUI,
  showAvatarModal
}; 