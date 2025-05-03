# 飞聊 - Windows桌面即时通讯程序

一个简洁美观的Windows桌面即时通讯应用程序，使用Electron构建。

## 功能特点

- 用户登录和账户管理
- 群聊功能
- 私聊功能
- 实时消息通知
- 简洁美观的用户界面
- 开发模式下支持热重载

## 如何运行

### 安装依赖

```bash
npm install
```

国内用户可以使用镜像源加速安装：

```bash
# 设置Electron镜像源
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# 安装所有依赖
npm install
```

### 启动应用

```bash
# 正常模式
npm start

# 开发模式（带热重载和开发者工具）
npm run dev
```

### 开发说明

项目支持热重载，在开发模式下修改代码后会自动刷新，无需手动重启应用。热重载适用于以下文件：

- HTML、CSS文件
- JavaScript文件（包括main.js和renderer.js）
- 资源文件

### 打包应用

```bash
npm run build
```

## 技术栈

- Electron - 桌面应用开发框架
- HTML/CSS/JavaScript - 前端界面
- Node.js - 本地服务

## 应用界面

- 登录界面：用户输入用户名进行登录
- 主界面：左侧为用户列表，右侧为聊天窗口
- 群聊和私聊支持

## 如何使用

1. 输入用户名登录
2. 默认进入群聊模式
3. 点击左侧的用户可以切换到私聊模式
4. 在底部输入框输入消息，点击发送或按Enter键发送消息
5. 点击右上角的退出按钮可以退出登录

## 项目结构

- `main.js` - Electron主进程
- `index.html` - 应用主界面
- `renderer.js` - 渲染进程，处理界面交互
- `package.json` - 项目配置和依赖管理

## 注意事项

本应用使用即时通讯模式，所有消息仅在应用内存中保存，关闭应用后消息将丢失。实际生产环境中，建议添加数据库持久化存储功能。 