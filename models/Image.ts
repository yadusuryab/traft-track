// models/Image.ts
import mongoose from 'mongoose';

const ExtractedDataSchema = new mongoose.Schema({
  name: {
    type: String,
    default: '',
  },
  phoneNumber: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  otherText: {
    type: String,
    default: '',
  },
  rawText: {
    type: String,
    default: '',
  },
});

const ImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  extractedData: {
    type: ExtractedDataSchema,
    required: true,
    default: () => ({}),
  },
  documentType: {
    type: String,
    default: 'general',
  },
  tags: [{
    type: String,
  }],
  uploadedBy: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

ImageSchema.index({ 
  title: 'text', 
  description: 'text', 
  'extractedData.rawText': 'text',
  'extractedData.name': 'text',
  'extractedData.phoneNumber': 'text',
  'extractedData.address': 'text',
  tags: 'text' 
});

export default mongoose.models.Image || mongoose.model('Image', ImageSchema);