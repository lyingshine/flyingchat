const express = require('express');
const Message = require('../models/Message');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要身份验证
router.use(authenticate);

/**
 * 获取群聊消息
 * GET /api/messages/group?page=1&limit=20
 */
router.get('/group', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({ isGroupMessage: true })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar')
      .lean();
    
    const total = await Message.countDocuments({ isGroupMessage: true });
    
    res.json({
      messages: messages.reverse(),
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

/**
 * 获取两个用户之间的私聊消息
 * GET /api/messages/private/:userId?page=1&limit=20
 */
router.get('/private/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const currentUserId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username avatar')
      .lean();
    
    const total = await Message.countDocuments({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    });
    
    // 将未读消息标记为已读
    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        isRead: false
      },
      { isRead: true }
    );
    
    res.json({
      messages: messages.reverse(),
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

/**
 * 获取未读消息数量
 * GET /api/messages/unread
 */
router.get('/unread', async (req, res) => {
  try {
    const result = await Message.aggregate([
      {
        $match: {
          receiver: req.user._id,
          isRead: false
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const unreadCounts = {};
    result.forEach(item => {
      unreadCounts[item._id] = item.count;
    });
    
    res.json({ unreadCounts });
  } catch (error) {
    console.error('获取未读消息错误:', error);
    res.status(500).json({ message: '服务器错误' });
  }
});

module.exports = router; 