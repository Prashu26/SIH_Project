const mongoose = require('mongoose');

const InstituteSchema = new mongoose.Schema({
  institute_code: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  name: {
    type: String,
    required: true
  },
  wallet_address: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: props => `${props.value} is not a valid Ethereum address!`
    }
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'suspended'],
    default: 'pending'
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update the timestamp on save
InstituteSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('Institute', InstituteSchema);
