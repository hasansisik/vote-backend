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
      required: [true, "Renk gereklidir"],
      default: '#f97316'
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
