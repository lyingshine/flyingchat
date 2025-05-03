const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const axios = require('axios');
const io = require('socket.io-client');
const isDev = !app.isPackaged;

// 启用热重载（仅在开发环境）
if (isDev) {
  require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit',
    // 监听这些文件的变化
    watched: [
      path.join(__dirname, '*.js'),
      path.join(__dirname, '*.html'),
      path.join(__dirname, '*.css')
    ]
  });
}

// 设置应用名称
app.name = '飞聊';

// 设置中文编码
app.commandLine.appendSwitch('lang', 'zh-CN');
app.commandLine.appendSwitch('disable-gpu-sandbox');
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-hardware-acceleration');
}

// 设置API基础URL
const API_BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

// 配置Axios默认值，确保正确处理中文数据
axios.defaults.headers.common['Accept'] = 'application/json, text/plain, */*';
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=utf-8';
axios.defaults.headers.put['Content-Type'] = 'application/json;charset=utf-8';

// 确保图标文件创建
try {
  require('./assets/icon.js');
} catch (err) {
  console.error('创建图标文件失败:', err);
}

// 保持对window对象的全局引用，避免JavaScript对象被垃圾回收时，窗口被自动关闭
let mainWindow;
let socket = null;
let currentUser = { token: '' };

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 800,
    minHeight: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    // 窗口设置
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: '#f5f5f5',
    show: false, // 先不显示窗口
    center: true // 窗口居中
  });

  // 设置空菜单
  Menu.setApplicationMenu(null);

  // 加载应用的index.html
  mainWindow.loadFile('index.html');

  // 当内容加载完成后显示窗口，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 只有在显式指定--open-devtools参数时才打开开发者工具
  if (isDev && process.argv.includes('--open-devtools')) {
    // 延迟打开DevTools，避免一些初始化错误
    setTimeout(() => {
      mainWindow.webContents.openDevTools();
    }, 1000);
  }

  // 当window被关闭时触发
  mainWindow.on('closed', function () {
    mainWindow = null;
    disconnectSocket();
  });
}

// 连接Socket.io
function connectSocket(token) {
  if (socket) {
    socket.disconnect();
  }
  
  // 保存当前用户token
  currentUser = { token };
  
  socket = io(SOCKET_URL, {
    auth: {
      token
    },
    forceNew: true,
    reconnectionAttempts: 5,
    timeout: 10000,
    transports: ['websocket', 'polling']
  });
  
  // 处理连接成功事件
  socket.on('connect', () => {
    console.log('Socket连接成功');
    
    // 连接成功后立即获取好友列表和待处理请求
    setTimeout(() => {
      if (mainWindow) {
        mainWindow.webContents.send('get-friends');
        mainWindow.webContents.send('get-pending-requests');
      }
    }, 500);
  });
  
  // 处理连接错误
  socket.on('connect_error', (error) => {
    console.error('Socket连接错误:', error.message);
    mainWindow?.webContents.send('login-response', {
      success: false,
      message: '连接服务器失败'
    });
    disconnectSocket();
  });
  
  // 处理在线用户列表更新
  socket.on('update-user-list', (users) => {
    mainWindow?.webContents.send('update-user-list', users);
  });
  
  // 处理新消息
  socket.on('new-message', (message) => {
    mainWindow?.webContents.send('new-message', message);
  });
  
  // 处理历史消息
  socket.on('history-messages', (data) => {
    mainWindow?.webContents.send('history-messages', data);
  });
  
  // 好友列表
  socket.on('friend-list', (friends) => {
    mainWindow?.webContents.send('friend-list', friends);
  });
  
  // 待处理好友请求
  socket.on('pending-friend-requests', (requests) => {
    mainWindow?.webContents.send('pending-friend-requests', requests);
  });
  
  // 收到新的好友请求
  socket.on('friend-request', (request) => {
    mainWindow?.webContents.send('friend-request', request);
  });
  
  // 好友请求被接受
  socket.on('friend-request-accepted', (data) => {
    mainWindow?.webContents.send('friend-request-accepted', data);
  });
  
  // 好友上线
  socket.on('friend-online', (friend) => {
    mainWindow?.webContents.send('friend-online', friend);
  });
  
  // 好友下线
  socket.on('friend-offline', (friend) => {
    mainWindow?.webContents.send('friend-offline', friend);
  });
  
  // 处理错误
  socket.on('error', (error) => {
    console.error('Socket错误:', error);
  });
}

// 断开Socket连接
function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(createWindow);

// 所有窗口关闭时退出应用
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// 处理用户注册
ipcMain.on('register-user', async (event, userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
    
    // 连接Socket
    connectSocket(response.data.token);
    
    // 发送成功响应给渲染进程
    event.sender.send('register-response', {
      success: true,
      user: response.data.user,
      token: response.data.token
    });
  } catch (error) {
    console.error('注册失败:', error.response?.data || error.message);
    
    // 发送错误响应给渲染进程
    event.sender.send('register-response', {
      success: false,
      message: error.response?.data?.message || '注册失败，请稍后再试'
    });
  }
});

// 处理用户登录
ipcMain.on('login-user', async (event, userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, userData);
    
    // 连接Socket
    connectSocket(response.data.token);
    
    // 发送成功响应给渲染进程
    event.sender.send('login-response', {
      success: true,
      user: response.data.user,
      token: response.data.token
    });
    
    // 获取好友列表和待处理的好友请求
    setTimeout(() => {
      event.sender.send('get-friends');
      event.sender.send('get-pending-requests');
    }, 1000);
  } catch (error) {
    console.error('登录失败:', error.response?.data || error.message);
    
    // 发送错误响应给渲染进程
    event.sender.send('login-response', {
      success: false,
      message: error.response?.data?.message || '登录失败，请检查用户名和密码'
    });
  }
});

// 处理自动登录
ipcMain.on('auto-login', async (event, userData) => {
  try {
    // 用保存的token获取用户信息
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${userData.token}`
      }
    });
    
    // 连接Socket
    connectSocket(userData.token);
    
    // 发送登录成功响应
    event.sender.send('login-response', {
      success: true,
      user: response.data.user,
      token: userData.token
    });
  } catch (error) {
    console.error('自动登录失败:', error.response?.data || error.message);
    // 不发送错误通知，因为自动登录失败是正常的
  }
});

// 处理用户登出
ipcMain.on('logout-user', (event) => {
  disconnectSocket();
});

// 处理消息发送
ipcMain.on('send-message', (event, message) => {
  if (socket && socket.connected) {
    socket.emit('send-message', message);
  }
});

// 处理加载消息
ipcMain.on('load-messages', (event, data) => {
  if (socket && socket.connected) {
    socket.emit('load-messages', data);
  }
});

// 处理搜索用户请求
ipcMain.on('search-users', async (event, data) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users/search`, {
      params: { keyword: data.keyword },
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    // 发送搜索结果给渲染进程
    event.sender.send('search-users-response', {
      success: true,
      users: response.data.users
    });
  } catch (error) {
    console.error('搜索用户失败:', error.response?.data || error.message);
    
    // 发送错误响应给渲染进程
    event.sender.send('search-users-response', {
      success: false,
      message: error.response?.data?.message || '搜索用户失败，请稍后再试'
    });
  }
});

// 处理发送好友请求
ipcMain.on('send-friend-request', async (event, data) => {
  try {
    await axios.post(`${API_BASE_URL}/friends/request`, {
      userId: data.userId
    }, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    // 发送成功响应给渲染进程
    event.sender.send('send-friend-request-response', {
      success: true
    });
  } catch (error) {
    console.error('发送好友请求失败:', error.response?.data || error.message);
    
    // 发送错误响应给渲染进程
    event.sender.send('send-friend-request-response', {
      success: false,
      message: error.response?.data?.message || '发送好友请求失败，请稍后再试'
    });
  }
});

// 处理响应好友请求
ipcMain.on('respond-friend-request', async (event, data) => {
  try {
    await axios.put(`${API_BASE_URL}/friends/request/${data.requestId}`, {
      accept: data.accept
    }, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    // 发送成功响应给渲染进程
    event.sender.send('respond-friend-request-response', {
      success: true,
      accepted: data.accept
    });
  } catch (error) {
    console.error('响应好友请求失败:', error.response?.data || error.message);
    
    // 发送错误响应给渲染进程
    event.sender.send('respond-friend-request-response', {
      success: false,
      message: error.response?.data?.message || '处理好友请求失败，请稍后再试'
    });
  }
});

// 处理获取好友列表
ipcMain.on('get-friends', async (event) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/friends`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    // 发送好友列表给渲染进程
    event.sender.send('friend-list', response.data.friends);
  } catch (error) {
    console.error('获取好友列表失败:', error.response?.data || error.message);
  }
});

// 处理获取待处理的好友请求
ipcMain.on('get-pending-requests', async (event) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/friends/requests/pending`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    // 发送待处理请求给渲染进程
    event.sender.send('pending-friend-requests', response.data.requests);
  } catch (error) {
    console.error('获取待处理好友请求失败:', error.response?.data || error.message);
  }
}); 