const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'flying-chat-secret-key';

// 中间件
app.use(cors());
app.use(express.json());

// 内存数据存储
const memoryDB = {
  users: [],
  messages: [],
  userId: 1,
  messageId: 1,
  friendRequests: [],
  friendRequestId: 1,
  friendships: []
};

// 工具函数
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

const findUserById = (id) => {
  return memoryDB.users.find(user => user.id === id);
};

const findUserByUsername = (username) => {
  return memoryDB.users.find(user => user.username === username);
};

// 身份验证中间件
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: '未授权' });
    }
    
    const decoded = verifyToken(token);
    const user = findUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: '用户不存在' });
    }
    
    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: '请先登录' });
  }
};

// 用户注册路由
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    
    // 检查用户名是否已存在
    const existingUser = findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: '用户名已被占用' });
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 创建新用户
    const user = {
      id: String(memoryDB.userId++),
      username,
      password: hashedPassword,
      avatar: '',
      avatarData: null,
      createdAt: new Date()
    };
    
    // 保存用户
    memoryDB.users.push(user);
    
    // 生成令牌
    const token = generateToken(user);
    
    // 返回用户信息（不包含密码）
    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        avatarData: user.avatarData,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户登录路由
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 验证输入
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    
    // 查找用户
    const user = findUserByUsername(username);
    if (!user) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: '用户名或密码错误' });
    }
    
    // 生成令牌
    const token = generateToken(user);
    
    // 返回用户信息
    res.json({
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        avatarData: user.avatarData,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        avatar: req.user.avatar,
        avatarData: req.user.avatarData,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取群聊消息
app.get('/api/messages/group', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // 获取群聊消息
    const messages = memoryDB.messages
      .filter(msg => msg.isGroupMessage)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);
    
    // 获取总数
    const total = memoryDB.messages.filter(msg => msg.isGroupMessage).length;
    
    res.json({
      messages: messages.map(msg => ({
        id: msg.id,
        from: msg.sender,
        fromUsername: findUserById(msg.sender)?.username || '未知用户',
        to: 'all',
        content: msg.content,
        timestamp: msg.createdAt
      })).reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取群聊消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取私聊消息
app.get('/api/messages/private/:userId', authenticate, async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    // 获取私聊消息
    const messages = memoryDB.messages
      .filter(msg => !msg.isGroupMessage && 
        ((msg.sender === currentUserId && msg.receiver === userId) ||
         (msg.sender === userId && msg.receiver === currentUserId)))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + limit);
    
    // 获取总数
    const total = memoryDB.messages.filter(msg => !msg.isGroupMessage && 
      ((msg.sender === currentUserId && msg.receiver === userId) ||
       (msg.sender === userId && msg.receiver === currentUserId))).length;
    
    // 更新未读状态
    memoryDB.messages.forEach(msg => {
      if (msg.sender === userId && msg.receiver === currentUserId && !msg.isRead) {
        msg.isRead = true;
      }
    });
    
    res.json({
      messages: messages.map(msg => ({
        id: msg.id,
        from: msg.sender,
        fromUsername: findUserById(msg.sender)?.username || '未知用户',
        to: msg.receiver,
        content: msg.content,
        timestamp: msg.createdAt,
        isSelf: msg.sender === currentUserId
      })).reverse(),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('获取私聊消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取未读消息数量
app.get('/api/messages/unread', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // 统计未读消息
    const unreadMessages = memoryDB.messages
      .filter(msg => msg.receiver === currentUserId && !msg.isRead);
    
    // 按发送者分组统计
    const unreadCounts = {};
    unreadMessages.forEach(msg => {
      if (!unreadCounts[msg.sender]) {
        unreadCounts[msg.sender] = 0;
      }
      unreadCounts[msg.sender]++;
    });
    
    res.json({ unreadCounts });
  } catch (error) {
    console.error('获取未读消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 搜索用户API
app.get('/api/users/search', authenticate, async (req, res) => {
  try {
    const keyword = req.query.keyword || '';
    
    if (!keyword.trim()) {
      return res.json({ users: [] });
    }
    
    // 搜索用户名包含关键词的用户
    const searchResults = memoryDB.users
      .filter(user => 
        user.id !== req.user.id && // 排除当前用户
        user.username.toLowerCase().includes(keyword.toLowerCase())
      )
      .map(user => ({
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        createdAt: user.createdAt
      }));
    
    res.json({ users: searchResults });
  } catch (error) {
    console.error('搜索用户错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 好友请求相关
// 发送好友请求
app.post('/api/friends/request', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user.id;
    
    // 验证目标用户存在
    const targetUser = findUserById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: '用户不存在' });
    }
    
    // 检查是否已经是好友
    const alreadyFriends = memoryDB.friendships.some(
      fs => (fs.user1 === currentUserId && fs.user2 === userId) || 
            (fs.user1 === userId && fs.user2 === currentUserId)
    );
    
    if (alreadyFriends) {
      return res.status(400).json({ message: '已经是好友了' });
    }
    
    // 检查是否已经发送过请求
    const existingRequest = memoryDB.friendRequests.find(
      fr => fr.from === currentUserId && fr.to === userId && fr.status === 'pending'
    );
    
    if (existingRequest) {
      return res.status(400).json({ message: '已经发送过好友请求' });
    }
    
    // 创建好友请求
    const newRequest = {
      id: String(memoryDB.friendRequestId++),
      from: currentUserId,
      to: userId,
      status: 'pending',
      createdAt: new Date()
    };
    
    memoryDB.friendRequests.push(newRequest);
    
    // 通过Socket.io发送实时通知给对方
    const targetSocket = Array.from(onlineUsers.values())
      .find(user => user.id === userId)?.socketId;
      
    if (targetSocket) {
      const currentUser = findUserById(currentUserId);
      io.to(targetSocket).emit('friend-request', {
        id: newRequest.id,
        from: currentUserId,
        fromUsername: currentUser ? currentUser.username : '未知用户',
        createdAt: newRequest.createdAt
      });
    }
    
    res.status(201).json({ message: '好友请求已发送' });
  } catch (error) {
    console.error('发送好友请求错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取待处理的好友请求
app.get('/api/friends/requests/pending', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // 获取发送给当前用户且状态为pending的请求
    const pendingRequests = memoryDB.friendRequests
      .filter(req => req.to === currentUserId && req.status === 'pending')
      .map(req => {
        const fromUser = findUserById(req.from);
        return {
          id: req.id,
          from: req.from,
          fromUsername: fromUser ? fromUser.username : '未知用户',
          createdAt: req.createdAt
        };
      });
    
    res.json({ requests: pendingRequests });
  } catch (error) {
    console.error('获取待处理好友请求错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 响应好友请求
app.put('/api/friends/request/:requestId', authenticate, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { accept } = req.body;
    const currentUserId = req.user.id;
    
    // 查找请求
    const request = memoryDB.friendRequests.find(req => req.id === requestId);
    
    if (!request) {
      return res.status(404).json({ message: '请求不存在' });
    }
    
    // 验证请求是发给当前用户的
    if (request.to !== currentUserId) {
      return res.status(403).json({ message: '无权操作此请求' });
    }
    
    // 验证请求状态为pending
    if (request.status !== 'pending') {
      return res.status(400).json({ message: '此请求已被处理' });
    }
    
    // 更新请求状态
    request.status = accept ? 'accepted' : 'rejected';
    
    // 如果接受请求，创建好友关系
    if (accept) {
      memoryDB.friendships.push({
        user1: request.from,
        user2: currentUserId,
        createdAt: new Date()
      });
      
      // 通过Socket.io发送通知给发送请求的用户
      const targetSocket = Array.from(onlineUsers.values())
        .find(user => user.id === request.from)?.socketId;
        
      if (targetSocket) {
        const currentUser = findUserById(currentUserId);
        io.to(targetSocket).emit('friend-request-accepted', {
          friend: {
            id: currentUserId,
            username: currentUser ? currentUser.username : '未知用户'
          }
        });
      }
    }
    
    res.json({ message: accept ? '已添加为好友' : '已拒绝好友请求' });
  } catch (error) {
    console.error('响应好友请求错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取好友列表
app.get('/api/friends', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // 获取所有相关的好友关系
    const friendships = memoryDB.friendships.filter(
      fs => fs.user1 === currentUserId || fs.user2 === currentUserId
    );
    
    // 提取好友ID并获取详细信息
    const friendList = friendships.map(fs => {
      const friendId = fs.user1 === currentUserId ? fs.user2 : fs.user1;
      const friend = findUserById(friendId);
      
      return {
        id: friendId,
        username: friend ? friend.username : '未知用户',
        avatar: friend ? friend.avatar : '',
        createdAt: fs.createdAt
      };
    });
    
    res.json({ friends: friendList });
  } catch (error) {
    console.error('获取好友列表错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 默认路由
app.get('/', (req, res) => {
  res.send('飞聊服务器运行中');
});

// 在线用户
const onlineUsers = new Map();

// Socket.io处理
io.use(async (socket, next) => {
  // 从客户端获取token
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('未授权'));
  }

  try {
    // 验证token
    const decoded = verifyToken(token);
    socket.userId = decoded.id;
    const user = findUserById(decoded.id);
    if (!user) {
      return next(new Error('用户不存在'));
    }
    socket.username = user.username;
    next();
  } catch (error) {
    next(new Error('无效的token'));
  }
});

io.on('connection', (socket) => {
  console.log(`用户连接: ${socket.username} (${socket.userId})`);
  
  // 将用户添加到在线用户列表
  onlineUsers.set(socket.userId, {
    id: socket.userId,
    username: socket.username,
    socketId: socket.id
  });
  
  // 广播在线用户列表
  io.emit('update-user-list', Array.from(onlineUsers.values()));

  // 处理连接成功事件
  socket.on('connect', () => {
    console.log('Socket连接成功');
    
    // 连接成功后立即获取好友列表和待处理请求
    setTimeout(() => {
      if (socket && socket.connected) {
        mainWindow?.webContents.send('get-friends');
        mainWindow?.webContents.send('get-pending-requests');
      }
    }, 500);
  });

  // 处理头像更新
  socket.on('update-avatar', (data, callback) => {
    try {
      console.log(`用户 ${socket.username} (${socket.userId}) 请求更新头像`);
      
      // 验证请求是否来自合法用户
      if (socket.userId !== data.userId) {
        console.error('用户ID不匹配，拒绝更新头像');
        if (callback) {
          callback({
            success: false,
            message: '无权更新此用户头像'
          });
        }
        return;
      }
      
      // 查找用户
      const user = findUserById(socket.userId);
      if (!user) {
        console.error('找不到用户，拒绝更新头像');
        if (callback) {
          callback({
            success: false,
            message: '用户不存在'
          });
        }
        return;
      }
      
      // 保存头像数据
      user.avatarData = data.avatarData;
      console.log(`用户 ${socket.username} 的头像已更新`);
      
      // 发送成功响应
      if (callback) {
        callback({
          success: true,
          message: '头像已成功更新'
        });
      }
    } catch (error) {
      console.error('更新头像时出错:', error);
      if (callback) {
        callback({
          success: false,
          message: '更新头像失败: ' + (error.message || '未知错误')
        });
      }
    }
  });

  // 处理消息发送
  socket.on('send-message', async (message) => {
    // 创建新消息
    const newMessage = {
      id: String(memoryDB.messageId++),
      sender: socket.userId,
      receiver: message.to === 'all' ? null : message.to,
      content: message.content,
      isGroupMessage: message.to === 'all',
      isRead: false,
      createdAt: new Date()
    };
    
    // 保存消息
    memoryDB.messages.push(newMessage);
    
    // 准备要发送的消息对象
    const messageToSend = {
      id: newMessage.id,
      from: socket.userId,
      fromUsername: socket.username,
      to: message.to,
      content: message.content,
      timestamp: newMessage.createdAt
    };
    
    // 群发消息
    if (message.to === 'all') {
      // 发送给发送者
      socket.emit('new-message', { ...messageToSend, isSelf: true });
      // 广播给其他人
      socket.broadcast.emit('new-message', messageToSend);
    } else {
      // 发送给发送者
      socket.emit('new-message', { ...messageToSend, isSelf: true });
      // 发送给接收者
      const receiverSocket = Array.from(onlineUsers.values())
        .find(user => user.id === message.to)?.socketId;
        
      if (receiverSocket) {
        io.to(receiverSocket).emit('new-message', messageToSend);
      }
    }
  });
  
  // 处理加载历史消息请求
  socket.on('load-messages', async ({ chatId, page = 1, limit = 20 }) => {
    try {
      const skip = (page - 1) * limit;
      let messages;
      
      if (chatId === 'all') {
        // 加载群聊消息
        messages = memoryDB.messages
          .filter(msg => msg.isGroupMessage)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + limit);
      } else {
        // 加载私聊消息
        messages = memoryDB.messages
          .filter(msg => !msg.isGroupMessage && 
            ((msg.sender === socket.userId && msg.receiver === chatId) ||
             (msg.sender === chatId && msg.receiver === socket.userId)))
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(skip, skip + limit);
          
        // 更新未读状态
        memoryDB.messages.forEach(msg => {
          if (msg.sender === chatId && msg.receiver === socket.userId && !msg.isRead) {
            msg.isRead = true;
          }
        });
      }
      
      // 将消息转换为客户端期望的格式并发送
      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        from: msg.sender,
        fromUsername: findUserById(msg.sender)?.username || '未知用户',
        to: msg.receiver || 'all',
        content: msg.content,
        timestamp: msg.createdAt,
        isSelf: msg.sender === socket.userId
      }));
      
      socket.emit('history-messages', {
        chatId,
        messages: formattedMessages.reverse(),
        page,
        hasMore: formattedMessages.length === limit
      });
    } catch (error) {
      console.error('加载消息错误:', error);
      socket.emit('error', { message: '加载消息失败' });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`用户断开连接: ${socket.username}`);
    onlineUsers.delete(socket.userId);
    io.emit('update-user-list', Array.from(onlineUsers.values()));
  });
});

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`服务器运行在端口: ${PORT}`);
});