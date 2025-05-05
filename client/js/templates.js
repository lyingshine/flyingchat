/**
 * 模板加载器 - 负责动态加载HTML模板
 */

// 模板路径
const TEMPLATES = {
  login: 'templates/login.html',
  sidebar: 'templates/sidebar.html',
  chatContainer: 'templates/chat-container.html',
  modals: 'templates/modals.html',
  loading: 'templates/loading.html',
  avatarModal: 'templates/modals/avatar-modal.html'
};

// 缓存加载的模板
const templateCache = {};

/**
 * 加载HTML模板
 * @param {string} templateName 模板名称
 * @returns {Promise<string>} 模板HTML内容
 */
async function loadTemplate(templateName) {
  if (templateCache[templateName]) {
    return templateCache[templateName];
  }
  
  try {
    console.log(`正在加载模板: ${templateName}`);
    const response = await fetch(TEMPLATES[templateName]);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${templateName}`);
    }
    
    const html = await response.text();
    templateCache[templateName] = html;
    return html;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return '';
  }
}

/**
 * 将模板渲染到指定容器
 * @param {string} templateName 模板名称
 * @param {HTMLElement} container 容器元素
 */
async function renderTemplate(templateName, container) {
  const html = await loadTemplate(templateName);
  container.innerHTML = html;
}

/**
 * 初始化应用模板
 */
async function initTemplates() {
  // 加载加载中模板
  const loadingTemplate = await loadTemplate('loading');
  document.getElementById('loading-container').innerHTML = loadingTemplate;
  
  // 加载模态框和其他全局组件 - 先加载基本模态框
  const modalsTemplate = await loadTemplate('modals');
  document.getElementById('modals-container').innerHTML = modalsTemplate;
  
  // 加载头像模态框 - 确保在基本模态框加载后追加
  try {
    const avatarModalTemplate = await loadTemplate('avatarModal');
    if (avatarModalTemplate && avatarModalTemplate.trim() !== '') {
      console.log('成功加载头像模态框模板');
      // 将头像模态框追加到模态框容器
      const modalsContainer = document.getElementById('modals-container');
      if (modalsContainer) {
        modalsContainer.innerHTML += avatarModalTemplate;
        console.log('头像模态框已添加到DOM');
        
        // 检查头像模态框是否成功添加
        const avatarModal = document.getElementById('avatarModal');
        console.log('检查avatarModal元素是否存在:', !!avatarModal);
      }
    } else {
      console.warn('头像模态框模板为空');
    }
  } catch (error) {
    console.error('加载头像模态框失败:', error);
  }
}

module.exports = {
  loadTemplate,
  renderTemplate,
  initTemplates
}; 