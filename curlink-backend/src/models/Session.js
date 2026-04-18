const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const SessionSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    // Stores the last known medical context so follow-ups inherit it
    context: {
      disease: { type: String, default: '' },
      patientName: { type: String, default: '' },
      location: { type: String, default: '' },
    },
    messages: [MessageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', SessionSchema);