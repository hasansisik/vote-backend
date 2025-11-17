const mongoose = require('mongoose');

const TestCategorySchema = new mongoose.Schema({
  // i18n support
  name: {
    tr: { type: String, required: [true, 'Türkçe kategori adı gereklidir'], trim: true },
    en: { type: String, trim: true },
    de: { type: String, trim: true },
    fr: { type: String, trim: true },
  },
  description: {
    tr: { type: String, default: '', trim: true },
    en: { type: String, default: '', trim: true },
    de: { type: String, default: '', trim: true },
    fr: { type: String, default: '', trim: true },
  },
  htmlContent: {
    tr: { type: String, default: '' },
    en: { type: String, default: '' },
    de: { type: String, default: '' },
    fr: { type: String, default: '' },
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
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
    // Use Turkish name for slug generation
    this.slug = generateSlug(this.name.tr);
  }
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
TestCategorySchema.index({ slug: 1 });

// Static method to get all categories
TestCategorySchema.statics.getAllCategories = function() {
  return this.find({}).sort({ 'name.tr': 1 });
};

// Static method to get category by slug
TestCategorySchema.statics.getBySlug = function(slug) {
  return this.findOne({ slug });
};

const TestCategory = mongoose.model('TestCategory', TestCategorySchema);

module.exports = { TestCategory };
