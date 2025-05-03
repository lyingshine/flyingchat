# 飞聊（Flying Chat）

飞聊是一个基于Electron的跨平台桌面聊天应用程序，提供群聊和私聊功能。

## 功能特点

- 用户注册和登录系统
- 实时消息发送和接收
- 群聊功能
- 私聊功能
- 好友系统
- 消息时间线显示
- 图片消息支持
- 表情消息支持
- 未读消息提醒
- 消息历史记录

## 技术栈

- Electron
- Node.js
- Socket.io
- HTML/CSS/JavaScript

## 安装与运行

### 前提条件

- Node.js 14.0 或更高版本
- npm 6.0 或更高版本

### 安装步骤

1. 克隆仓库
```
git clone https://github.com/你的用户名/flying.git
cd flying
```

2. 安装依赖
```
cd server
npm install
cd ../client
npm install
```

3. 启动服务器
```
cd server
npm start
```

4. 在新的终端窗口启动客户端
```
cd client
npm start
```

## 项目结构

- `/client` - Electron客户端应用
- `/server` - Node.js服务器

## 许可证

MIT 