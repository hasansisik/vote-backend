const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    testCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCategory',
      required: [true, "Test kategorisi gereklidir"],
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Virtual fields for name, color, and slug from testCategory
MenuSchema.virtual('name').get(function() {
  return this.testCategory?.name || '';
});

MenuSchema.virtual('color').get(function() {
  return this.testCategory?.color || '';
});

MenuSchema.virtual('slug').get(function() {
  return this.testCategory?.slug || '';
});

// Static method to get active menus with populated testCategory
MenuSchema.statics.getActiveMenus = function() {
  return this.find({ isActive: true })
    .populate('testCategory')
    .sort({ order: 1, createdAt: 1 });
};

// Instance method to toggle active status
MenuSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

const Menu = mongoose.model("Menu", MenuSchema);

module.exports = Menu;
