const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    testCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCategory',
      required: [true, "Test kategorisi gereklidir"],
      unique: true
    },
    color: {
      type: String,
      required: [true, "Renk gereklidir"]
    },
    order: {
      type: Number,
      required: [true, "Sıralama gereklidir"],
      default: 0
    },
    // i18n support
    name: {
      tr: { type: String, required: [true, "Türkçe menü adı gereklidir"] },
      en: { type: String },
      de: { type: String },
      fr: { type: String },
    },
    description: {
      tr: { type: String, default: '' },
      en: { type: String, default: '' },
      de: { type: String, default: '' },
      fr: { type: String, default: '' },
    }
  },
  { 
    timestamps: true,
    // Completely disable virtuals
    toJSON: { virtuals: false },
    toObject: { virtuals: false }
  }
);

// Explicitly disable all virtuals
MenuSchema.set('toJSON', { virtuals: false });
MenuSchema.set('toObject', { virtuals: false });

// Remove any existing virtuals
MenuSchema.virtuals = {};

// Static method to get all menus with populated testCategory
MenuSchema.statics.getAllMenus = function() {
  return this.find({})
    .populate('testCategory')
    .sort({ order: 1, createdAt: 1 });
};

const Menu = mongoose.model("Menu", MenuSchema);

module.exports = Menu;
