const mongoose = require("mongoose");

// Menu Schema
const MenuSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, "Menü başlığı gereklidir"],
    trim: true 
  },
  url: { 
    type: String, 
    trim: true,
    default: "#"
  },
  icon: { 
    type: String, 
    trim: true 
  },
  isDropdown: { 
    type: Boolean, 
    default: false 
  },
  parent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Menu',
    default: null
  },
  children: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Menu' 
  }],
  order: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  target: { 
    type: String, 
    enum: ['_self', '_blank', '_parent', '_top'],
    default: '_self'
  },
  // Menü türü (header, footer, sidebar vb.)
  type: { 
    type: String, 
    enum: ['header', 'footer', 'sidebar', 'mobile'],
    default: 'header'
  },
  // CSS class'ları
  cssClass: { 
    type: String, 
    trim: true 
  },
  // Menü açıklaması
  description: { 
    type: String, 
    trim: true 
  },
  // Menü oluşturan kullanıcı
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Index'ler
MenuSchema.index({ type: 1, order: 1 });
MenuSchema.index({ parent: 1 });
MenuSchema.index({ isActive: 1 });

// Virtual field - Alt menü sayısı
MenuSchema.virtual('childrenCount').get(function() {
  return this.children ? this.children.length : 0;
});

// Virtual field - Tam URL (parent ile birlikte)
MenuSchema.virtual('fullUrl').get(function() {
  if (this.url.startsWith('http') || this.url.startsWith('/')) {
    return this.url;
  }
  return `/${this.url}`;
});

// Pre-save middleware - Order otomatik ayarla
MenuSchema.pre('save', async function(next) {
  if (this.isNew && this.order === 0) {
    const maxOrder = await this.constructor.findOne(
      { type: this.type, parent: this.parent },
      { order: 1 }
    ).sort({ order: -1 });
    
    this.order = maxOrder ? maxOrder.order + 1 : 1;
  }
  next();
});

// Method - Alt menü ekle
MenuSchema.methods.addChild = function(childId) {
  if (!this.children.includes(childId)) {
    this.children.push(childId);
    this.isDropdown = true;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method - Alt menü çıkar
MenuSchema.methods.removeChild = function(childId) {
  this.children = this.children.filter(id => id.toString() !== childId.toString());
  if (this.children.length === 0) {
    this.isDropdown = false;
  }
  return this.save();
};

// Method - Menüyü aktif/pasif yap
MenuSchema.methods.toggleActive = function() {
  this.isActive = !this.isActive;
  return this.save();
};

// Method - Sıralama değiştir
MenuSchema.methods.changeOrder = function(newOrder) {
  this.order = newOrder;
  return this.save();
};

// Static method - Belirli tipte menüleri getir
MenuSchema.statics.getByType = function(type, includeInactive = false) {
  const filter = { type };
  if (!includeInactive) {
    filter.isActive = true;
  }
  
  return this.find(filter)
    .populate('children', 'title url icon order isActive')
    .populate('parent', 'title url')
    .populate('createdBy', 'name surname')
    .sort({ order: 1, createdAt: 1 });
};

// Static method - Ana menüleri getir (parent'ı olmayan)
MenuSchema.statics.getMainMenus = function(type = 'header') {
  return this.find({ 
    type, 
    parent: null, 
    isActive: true 
  })
    .populate('children', 'title url icon order isActive target')
    .populate('createdBy', 'name surname')
    .sort({ order: 1, createdAt: 1 });
};

// Static method - Menü ağacını getir (hierarchical)
MenuSchema.statics.getMenuTree = function(type = 'header') {
  return this.find({ 
    type, 
    isActive: true 
  })
    .populate('children', 'title url icon order isActive target')
    .populate('parent', 'title url')
    .sort({ order: 1, createdAt: 1 });
};

// Static method - Menü sıralamasını güncelle
MenuSchema.statics.updateOrder = async function(menuId, newOrder) {
  const menu = await this.findById(menuId);
  if (!menu) {
    throw new Error('Menü bulunamadı');
  }
  
  const oldOrder = menu.order;
  menu.order = newOrder;
  await menu.save();
  
  // Diğer menülerin sıralamasını güncelle
  if (newOrder > oldOrder) {
    await this.updateMany(
      { 
        type: menu.type, 
        parent: menu.parent,
        order: { $gt: oldOrder, $lte: newOrder },
        _id: { $ne: menuId }
      },
      { $inc: { order: -1 } }
    );
  } else if (newOrder < oldOrder) {
    await this.updateMany(
      { 
        type: menu.type, 
        parent: menu.parent,
        order: { $gte: newOrder, $lt: oldOrder },
        _id: { $ne: menuId }
      },
      { $inc: { order: 1 } }
    );
  }
  
  return menu;
};

const Menu = mongoose.model("Menu", MenuSchema);

module.exports = { Menu };
