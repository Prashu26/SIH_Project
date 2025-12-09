const express = require('express');
const Message = require('../models/Message');
const Organization = require('../models/Organization');
const User = require('../models/User');
const auth = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/messages/conversations
 * Get all conversations for the authenticated user/organization
 */
router.get('/conversations', auth(), async (req, res) => {
  try {
    const { type } = req.user;
    const userId = type === 'organization' ? req.user.organizationId : req.user.userId;

    // Get unique conversation IDs for this user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { 'sender.id': userId, 'sender.type': type },
            { 'recipient.id': userId, 'recipient.type': type }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient.id', userId] },
                    { $eq: ['$recipient.type', type] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch conversations',
      error: error.message
    });
  }
});

/**
 * GET /api/messages/:conversationId
 * Get messages for a specific conversation
 */
router.get('/:conversationId', auth(), async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { type } = req.user;
    const userId = type === 'organization' ? req.user.organizationId : req.user.userId;

    // Verify user is part of this conversation
    const hasAccess = await Message.findOne({
      conversationId,
      $or: [
        { 'sender.id': userId, 'sender.type': type },
        { 'recipient.id': userId, 'recipient.type': type }
      ]
    });

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this conversation'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark messages as read for the current user
    await Message.updateMany(
      {
        conversationId,
        'recipient.id': userId,
        'recipient.type': type,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      messages: messages.reverse() // Return in chronological order
    });

  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch messages',
      error: error.message
    });
  }
});

/**
 * POST /api/messages/send
 * Send a new message
 */
router.post('/send', auth(), async (req, res) => {
  try {
    const { recipientId, recipientType, content, messageType = 'text' } = req.body;
    const { type } = req.user;
    const senderId = type === 'organization' ? req.user.organizationId : req.user.userId;

    // Get sender info
    let senderInfo;
    if (type === 'organization') {
      senderInfo = await Organization.findById(senderId, 'organizationName');
    } else {
      senderInfo = await User.findById(senderId, 'name');
    }

    // Get recipient info
    let recipientInfo;
    if (recipientType === 'organization') {
      recipientInfo = await Organization.findById(recipientId, 'organizationName');
    } else {
      recipientInfo = await User.findById(recipientId, 'name');
    }

    if (!senderInfo || !recipientInfo) {
      return res.status(404).json({
        success: false,
        message: 'Sender or recipient not found'
      });
    }

    // Generate conversation ID (consistent for both parties)
    const conversationId = [
      `${type}:${senderId}`,
      `${recipientType}:${recipientId}`
    ].sort().join('__');

    const message = new Message({
      conversationId,
      sender: {
        id: senderId,
        type,
        name: type === 'organization' ? senderInfo.organizationName : senderInfo.name
      },
      recipient: {
        id: recipientId,
        type: recipientType,
        name: recipientType === 'organization' ? recipientInfo.organizationName : recipientInfo.name
      },
      content,
      messageType
    });

    await message.save();

    // Update organization stats if sender is organization
    if (type === 'organization') {
      await Organization.findByIdAndUpdate(senderId, {
        $inc: { 'stats.activeConversations': 1 }
      });
    }

    res.json({
      success: true,
      message
    });

  } catch (error) {
    logger.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: error.message
    });
  }
});

/**
 * POST /api/messages/initiate
 * Initiate conversation with a learner (for organizations)
 */
router.post('/initiate', auth(), async (req, res) => {
  try {
    if (req.user.type !== 'organization') {
      return res.status(403).json({
        success: false,
        message: 'Only organizations can initiate conversations'
      });
    }

    const { learnerId, initialMessage } = req.body;
    const organizationId = req.user.organizationId;

    // Check if learner exists
    const learner = await User.findById(learnerId);
    if (!learner || learner.role !== 'learner') {
      return res.status(404).json({
        success: false,
        message: 'Learner not found'
      });
    }

    // Get organization info
    const organization = await Organization.findById(organizationId, 'organizationName');

    // Generate conversation ID
    const conversationId = [
      `organization:${organizationId}`,
      `learner:${learnerId}`
    ].sort().join('__');

    // Check if conversation already exists
    const existingMessage = await Message.findOne({ conversationId });
    if (existingMessage) {
      return res.status(400).json({
        success: false,
        message: 'Conversation already exists'
      });
    }

    const message = new Message({
      conversationId,
      sender: {
        id: organizationId,
        type: 'organization',
        name: organization.organizationName
      },
      recipient: {
        id: learnerId,
        type: 'learner',
        name: learner.name
      },
      content: initialMessage,
      messageType: 'text'
    });

    await message.save();

    // Update organization stats
    await Organization.findByIdAndUpdate(organizationId, {
      $inc: { 
        'stats.studentsContacted': 1,
        'stats.activeConversations': 1
      }
    });

    res.json({
      success: true,
      message: 'Conversation initiated successfully',
      conversationId,
      messageData: message
    });

  } catch (error) {
    logger.error('Initiate conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate conversation',
      error: error.message
    });
  }
});

module.exports = router;