const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Menü adı gereklidir"],
      trim: true,
      unique: true
    },
    color: {
      type: String,
      required: [true, "Menü rengi gereklidir"],
      trim: true
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true
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

// Pre-save middleware to generate slug from Turkish name
MenuSchema.pre("save", function (next) {
  if (this.isModified("name") || this.isNew) {
    // Convert Turkish characters to English equivalents
    const turkishToEnglish = {
      'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
      'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
    };
    
    let slug = this.name
      .toLowerCase()
      .replace(/[çğıöşüÇĞİÖŞÜ]/g, (char) => turkishToEnglish[char] || char)
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .trim('-'); // Remove leading/trailing hyphens
    
    this.slug = slug;
  }
  next();
});

// Static method to get active menus
MenuSchema.statics.getActiveMenus = function() {
  return this.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
};

// Instance method to toggle active status
MenuSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

const Menu = mongoose.model("Menu", MenuSchema);

module.exports = Menu;
