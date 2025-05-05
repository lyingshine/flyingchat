/**
 * 主进程脚本 - 处理应用程序生命周期和创建原生浏览器窗口
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const socket = require('socket.io-client');
const { v4: uuidv4 } = require('uuid');

// 服务器地址
const SERVER_URL = 'http://localhost:3000';

// 客户端ID
const CLIENT_ID = uuidv4();

// 主窗口
let mainWindow;

// Socket.io 连接
let io;

// 当前用户信息
let currentUser = null;

/**
 * 创建主窗口
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 420,
    minWidth: 380,
    minHeight: 420,
    maxWidth: 450,
    maxHeight: 520,
    frame: false, // 无边框窗口
    transparent: true, // 设置透明
    backgroundColor: '#FFFFFF', // 设置白色背景
    hasShadow: true, // 启用窗口阴影
    resizable: false, // 禁止调整大小
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      preload: path.join(__dirname, 'preload.js') // 预加载脚本
    },
    roundedCorners: true // 启用圆角
  });
  
  // 加载主页面
  mainWindow.loadFile('index.html');
  
  // 设置窗口圆角 - Windows系统专用设置
  if (process.platform === 'win32') {
    // 等待DOM和窗口内容加载完毕
    mainWindow.webContents.on('did-finish-load', () => {
      mainWindow.setBackgroundColor('#FFFFFF');
    });
  }
  
  // 在生产环境下禁用开发者工具
  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools();
    });
  } else {
    // 在开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();
  }
  
  // 当窗口关闭时发生的事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 连接到聊天服务器
 * @param {Object} token 可选的认证令牌
 */
function connectToServer(token) {
  // 如果已连接且要重新连接，先断开
  if (io) {
    io.disconnect();
  }

  console.log('正在连接到服务器...');
  
  // 设置连接选项
  const options = {
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 5000,
    auth: { clientId: CLIENT_ID }
  };
  
  // 如果有token，添加到认证信息中
  if (token) {
    options.auth.token = token;
  }
  
  // 创建Socket.io连接
  io = socket(SERVER_URL, options);
  
  // 连接事件
  io.on('connect', () => {
    console.log('成功连接到服务器');
    
    // 如果已登录且有token，不需要额外发送authenticate事件，因为连接时已提供token
  });
  
  // 断开连接事件
  io.on('disconnect', () => {
    console.log('与服务器断开连接');
  });
  
  // 连接错误事件
  io.on('connect_error', (err) => {
    console.error('服务器连接错误:', err);
    
    // 通知渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('server-connection-error', {
        message: '服务器连接错误: ' + (err.message || '未知错误')
      });
    }
  });
  
  // 认证成功事件
  io.on('authenticated', () => {
    console.log('服务器认证成功');
    
    // 通知渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('authentication-success');
    }
  });
  
  // 认证失败事件
  io.on('authentication-error', (error) => {
    console.error('服务器认证失败:', error);
    
    // 通知渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('authentication-error', error);
    }
  });
  
  // 新消息事件
  io.on('new-message', (message) => {
    // 转发到渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('new-message', message);
    }
  });
  
  // 在线用户更新事件
  io.on('online-users', (users) => {
    // 转发到渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('online-users-updated', users);
    }
  });
  
  // 好友请求事件
  io.on('friend-request', (request) => {
    // 转发到渲染进程
    if (mainWindow) {
      mainWindow.webContents.send('new-friend-request', request);
    }
  });
}

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();
  // 不再立即连接服务器
  // connectToServer();
  
  app.on('activate', () => {
    // 在macOS上，当点击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
  
  // 监听渲染进程的窗口控制请求
  ipcMain.on('window-minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });
  
  ipcMain.on('window-maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });
  
  ipcMain.on('window-close', () => {
    if (mainWindow) mainWindow.close();
  });
});

// 当所有窗口关闭时退出应用
app.on('window-all-closed', () => {
  // 在macOS上，除非用户用Cmd + Q确定地退出，
  // 否则绝大部分应用及其菜单栏会保持激活
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 在应用将要退出时清理
app.on('will-quit', () => {
  // 断开Socket.io连接
  if (io) {
    io.disconnect();
  }
});

// 用户登录请求
ipcMain.on('login-user', async (event, credentials) => {
  try {
    console.log('登录请求:', credentials.username);
    
    // 使用HTTP API登录而不是Socket.io
    const axios = require('axios');
    const response = await axios.post(`${SERVER_URL}/api/auth/login`, {
      username: credentials.username,
      password: credentials.password
    });
    
    // 登录成功
    if (response.data && response.data.user && response.data.token) {
      // 保存用户信息
      currentUser = response.data.user;
      currentUser.token = response.data.token;
      
      // 用获取到的token重新连接WebSocket
      connectToServer(response.data.token);
      
      // 登录成功后调整窗口大小
      if (mainWindow) {
        // 调整窗口大小为聊天界面大小
        mainWindow.setSize(800, 600);
        mainWindow.setMinimumSize(700, 500);
        mainWindow.setMaximumSize(1200, 900);
        mainWindow.setResizable(true); // 允许调整大小
        mainWindow.center(); // 窗口居中
      }
      
      // 发送响应到渲染进程
      event.reply('login-response', {
        success: true,
        user: currentUser
      });
    } else {
      // 登录失败
      event.reply('login-response', {
        success: false,
        message: '登录失败，服务器返回了意外的数据格式'
      });
    }
  } catch (error) {
    console.error('登录错误:', error.message);
    // 登录失败
    event.reply('login-response', {
      success: false,
      message: error.response?.data?.message || '登录失败，请检查用户名和密码'
    });
  }
});

// 用户注册请求
ipcMain.on('register-user', async (event, userData) => {
  try {
    console.log('注册请求:', userData.username);
    
    // 使用HTTP API注册而不是Socket.io
    const axios = require('axios');
    const response = await axios.post(`${SERVER_URL}/api/auth/register`, {
      username: userData.username,
      password: userData.password
    });
    
    // 注册成功
    if (response.data && response.data.user) {
      event.reply('register-response', {
        success: true,
        message: '注册成功，请登录'
      });
    } else {
      // 注册失败
      event.reply('register-response', {
        success: false,
        message: '注册失败，服务器返回了意外的数据格式'
      });
    }
  } catch (error) {
    console.error('注册错误:', error.message);
    // 注册失败
    event.reply('register-response', {
      success: false,
      message: error.response?.data?.message || '注册失败'
    });
  }
});

// 自动登录请求
ipcMain.on('auto-login', (event, user) => {
  try {
    // 保存用户信息
    currentUser = user;
    
    // 使用token连接到服务器
    if (user && user.token) {
      connectToServer(user.token);
      
      // 尝试验证token有效性
      const axios = require('axios');
      axios.get(`${SERVER_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        }
      }).then(response => {
        // token有效
        
        // 获取最新的用户数据
        const updatedUser = {
          ...user,
          ...response.data.user  // 使用服务器返回的最新用户数据
        };
        
        // 更新当前用户数据
        currentUser = updatedUser;
        
        // 更新本地存储
        if (mainWindow) {
          mainWindow.webContents.send('update-local-user', updatedUser);
        }
        
        // 登录成功后调整窗口大小
        if (mainWindow) {
          // 调整窗口大小为聊天界面大小
          mainWindow.setSize(800, 600);
          mainWindow.setMinimumSize(700, 500);
          mainWindow.setMaximumSize(1200, 900);
          mainWindow.setResizable(true); // 允许调整大小
          mainWindow.center(); // 窗口居中
        }
        
        event.reply('auto-login-response', { success: true });
      }).catch(error => {
        // token无效
        console.error('自动登录验证失败:', error.message);
        event.reply('auto-login-response', { 
          success: false, 
          message: '登录已过期，请重新登录' 
        });
      });
    } else {
      // 没有token
      event.reply('auto-login-response', { 
        success: false, 
        message: '登录信息不完整' 
      });
    }
  } catch (error) {
    console.error('自动登录错误:', error);
    event.reply('auto-login-response', { 
      success: false, 
      message: '自动登录失败' 
    });
  }
});

// 用户登出请求
ipcMain.on('logout-user', (event) => {
  try {
    // 发送登出请求
    if (io && currentUser) {
      io.emit('logout', {
        token: currentUser.token,
        clientId: CLIENT_ID
      });
      
      // 断开WebSocket连接
      io.disconnect();
    }
    
    // 清除用户信息
    currentUser = null;
    
    // 回复渲染进程
    event.reply('logout-response', { success: true });
  } catch (error) {
    console.error('登出错误:', error);
    event.reply('logout-response', { success: true }); // 即使出错也视为登出成功
  }
});

// 发送消息请求
ipcMain.on('send-message', (event, message) => {
  try {
    if (!currentUser || !io) {
      event.reply('message-sent-error', { message: '未连接到服务器' });
      return;
    }
    
    // 添加发送方信息
    const fullMessage = {
      ...message,
      from: currentUser.id,
      clientId: CLIENT_ID,
      timestamp: Date.now()
    };
    
    // 发送消息
    io.emit('message', fullMessage);
    event.reply('message-sent', { success: true });
  } catch (error) {
    console.error('发送消息错误:', error);
    event.reply('message-sent-error', { message: '发送消息失败' });
  }
});

// 加载消息请求
ipcMain.on('load-messages', async (event, params) => {
  try {
    if (!currentUser) {
      event.reply('messages-loaded-error', { message: '未登录' });
      return;
    }
    
    // 使用HTTP API获取消息
    const axios = require('axios');
    const endpoint = params.isGroup 
      ? `${SERVER_URL}/api/messages/group` 
      : `${SERVER_URL}/api/messages/private/${params.userId}`;
    
    const response = await axios.get(endpoint, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      },
      params: {
        page: params.page || 1,
        limit: params.limit || 20
      }
    });
    
    event.reply('messages-loaded', response.data);
  } catch (error) {
    console.error('加载消息错误:', error);
    event.reply('messages-loaded-error', { 
      message: error.response?.data?.message || '加载消息失败' 
    });
  }
});

// 获取好友列表请求
ipcMain.on('get-friends', async (event) => {
  try {
    if (!currentUser) {
      event.reply('friends-loaded-error', { message: '未登录' });
      return;
    }
    
    // 使用HTTP API获取好友列表
    const axios = require('axios');
    const response = await axios.get(`${SERVER_URL}/api/friends`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    event.reply('friends-loaded', response.data.friends || []);
  } catch (error) {
    console.error('获取好友列表错误:', error);
    event.reply('friends-loaded-error', { 
      message: error.response?.data?.message || '获取好友列表失败' 
    });
  }
});

// 获取好友请求列表请求
ipcMain.on('get-friend-requests', async (event) => {
  try {
    if (!currentUser) {
      event.reply('friend-requests-loaded-error', { message: '未登录' });
      return;
    }
    
    // 使用HTTP API获取好友请求列表
    const axios = require('axios');
    const response = await axios.get(`${SERVER_URL}/api/friends/requests/pending`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    event.reply('friend-requests-loaded', response.data.requests || []);
  } catch (error) {
    console.error('获取好友请求列表错误:', error);
    event.reply('friend-requests-loaded-error', { 
      message: error.response?.data?.message || '获取好友请求列表失败' 
    });
  }
});

// 搜索用户请求
ipcMain.on('search-users', async (event, params) => {
  try {
    if (!currentUser) {
      event.reply('users-search-error', { message: '未登录' });
      return;
    }
    
    // 使用HTTP API搜索用户
    const axios = require('axios');
    const response = await axios.get(`${SERVER_URL}/api/users/search`, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      },
      params: {
        query: params.query
      }
    });
    
    event.reply('users-search-result', response.data.users || []);
  } catch (error) {
    console.error('搜索用户错误:', error);
    event.reply('users-search-error', { 
      message: error.response?.data?.message || '搜索用户失败' 
    });
  }
});

// 发送好友请求
ipcMain.on('send-friend-request', async (event, params) => {
  try {
    if (!currentUser) {
      event.reply('friend-request-response-error', { message: '未登录' });
      return;
    }
    
    // 使用HTTP API发送好友请求
    const axios = require('axios');
    const response = await axios.post(`${SERVER_URL}/api/friends/request`, {
      targetUserId: params.targetUserId
    }, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    event.reply('friend-request-response', response.data);
  } catch (error) {
    console.error('发送好友请求错误:', error);
    event.reply('friend-request-response-error', { 
      message: error.response?.data?.message || '发送好友请求失败' 
    });
  }
});

// 响应好友请求
ipcMain.on('respond-to-friend-request', async (event, params) => {
  try {
    if (!currentUser) {
      event.reply('friend-request-result-error', { message: '未登录' });
      return;
    }
    
    // 使用HTTP API响应好友请求
    const axios = require('axios');
    const response = await axios.put(`${SERVER_URL}/api/friends/request/${params.requestId}`, {
      accept: params.accept
    }, {
      headers: {
        Authorization: `Bearer ${currentUser.token}`
      }
    });
    
    event.reply('friend-request-result', response.data);
  } catch (error) {
    console.error('响应好友请求错误:', error);
    event.reply('friend-request-result-error', { 
      message: error.response?.data?.message || '响应好友请求失败' 
    });
  }
});

/**
 * 更新用户头像
 */
ipcMain.on('update-avatar', async (event, params) => {
  try {
    const { userId, avatarData } = params;
    
    // 验证用户是否登录
    if (!io || !io.connected || !currentUser) {
      event.reply('avatar-updated', {
        success: false,
        message: '未连接到服务器'
      });
      return;
    }
    
    // 确认请求的用户ID与当前登录用户匹配
    if (userId !== currentUser.id) {
      event.reply('avatar-updated', {
        success: false,
        message: '无权更新此用户头像'
      });
      return;
    }
    
    console.log('正在发送头像更新请求...');
    
    // 向服务器发送更新请求
    io.emit('update-avatar', {
      userId,
      avatarData
    }, response => {
      console.log('收到服务器头像更新响应:', response);
      // 回复渲染进程
      event.reply('avatar-updated', response);
    });
  } catch (error) {
    console.error('更新头像错误:', error);
    event.reply('avatar-updated', {
      success: false,
      message: '更新头像失败: ' + (error.message || '未知错误')
    });
  }
}); 