const mongoose = require('mongoose');

const TemplateFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    text: { type: String, default: '' },
    fontFamily: { type: String, default: 'Roboto' },
    fontSize: { type: Number, default: 16 },
    color: { type: String, default: '#000000' },
    xPct: { type: Number, required: true },
    yPct: { type: Number, required: true },
    widthPct: { type: Number, default: 20 },
    heightPct: { type: Number, default: 5 },
    rotate: { type: Number, default: 0 },
    zIndex: { type: Number, default: 1 },
    visible: { type: Boolean, default: true },
  },
  { _id: false }
);

const TemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    institute: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    backgroundPath: { type: String },
    assets: [{ type: String }],
    fields: { type: [TemplateFieldSchema], default: [] },
    defaultFont: { type: String, default: 'Roboto' },
    defaultFontSize: { type: Number, default: 14 },
    watermark: {
      invisible: { type: Boolean, default: true },
      text: { type: String, default: '' },
      opacity: { type: Number, default: 0.02 },
      position: { type: String, default: 'center' },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Template', TemplateSchema);
