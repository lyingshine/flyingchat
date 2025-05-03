const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null  // null表示群聊消息
  },
  content: {
    type: String,
    required: true
  },
  isGroupMessage: {
    type: Boolean,
    default: false
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建索引以便更快查询
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ isGroupMessage: 1, createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message; 