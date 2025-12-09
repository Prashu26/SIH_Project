const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, index: true },
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['organization', 'learner'], required: true },
    name: { type: String, required: true }
  },
  recipient: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['organization', 'learner'], required: true },
    name: { type: String, required: true }
  },
  content: { type: String, required: true, maxlength: 2000 },
  messageType: {
    type: String,
    enum: ['text', 'interview_invite', 'document_request', 'system'],
    default: 'text'
  },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  attachments: [{
    filename: { type: String },
    path: { type: String },
    size: { type: Number },
    mimetype: { type: String }
  }]
}, {
  timestamps: true
});

// Indexes for efficient querying
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ 'sender.id': 1, 'sender.type': 1 });
MessageSchema.index({ 'recipient.id': 1, 'recipient.type': 1 });
MessageSchema.index({ isRead: 1 });

module.exports = mongoose.model('Message', MessageSchema);