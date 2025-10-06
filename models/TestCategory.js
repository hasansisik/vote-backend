const mongoose = require('mongoose');

const TestCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Kategori adı gereklidir'],
    unique: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  color: {
    type: String,
    required: false, // Made optional for backward compatibility
    trim: true,
  },
  icon: {
    type: String,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Helper function to generate slug from Turkish text
const generateSlug = (text) => {
  const turkishChars = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
  };
  
  return text
    .toLowerCase()
    .replace(/[çğıöşüÇĞİÖŞÜ]/g, char => turkishChars[char] || char)
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim('-');
};

// Pre-save middleware to generate slug
TestCategorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = generateSlug(this.name);
  }
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
TestCategorySchema.index({ isActive: 1, order: 1 });
TestCategorySchema.index({ slug: 1 });

// Static method to get active categories
TestCategorySchema.statics.getActiveCategories = function() {
  return this.find({ isActive: true }).sort({ order: 1, name: 1 });
};

// Static method to get category by slug
TestCategorySchema.statics.getBySlug = function(slug) {
  return this.findOne({ slug, isActive: true });
};

module.exports = mongoose.model('TestCategory', TestCategorySchema);
