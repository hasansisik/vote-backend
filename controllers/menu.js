const Menu = require('../models/Menu');
const { TestCategory } = require('../models/TestCategory');
const { BadRequestError, NotFoundError } = require('../errors');

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

// Get all menus (public - no authentication required)
const getAllMenus = async (req, res) => {
  try {
    const { page = 1, limit = 50, sort = 'order' } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const menus = await Menu.find({})
      .populate('testCategory')
      .sort({ [sort]: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Menu.countDocuments({});
    
    res.status(200).json({
      success: true,
      count: menus.length,
      total,
      menus
    });
  } catch (error) {
    console.error('Get all menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Menüler getirilirken bir hata oluştu'
    });
  }
};

// Get active menus (public - no authentication required) - same as getAllMenus now
const getActiveMenus = async (req, res) => {
  try {
    const menus = await Menu.find({})
      .populate('testCategory')
      .sort({ order: 1, createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: menus.length,
      menus
    });
  } catch (error) {
    console.error('Get active menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Menüler getirilirken bir hata oluştu'
    });
  }
};

// Get single menu
const getMenu = async (req, res) => {
  try {
    const { id } = req.params;
    
    const menu = await Menu.findById(id).populate('testCategory');
    if (!menu) {
      throw new NotFoundError('Menü bulunamadı');
    }
    
    res.status(200).json({
      success: true,
      menu
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Menü getirilirken bir hata oluştu'
    });
  }
};

// Create menu
const createMenu = async (req, res) => {
  try {
    const { testCategoryId, color, order, name, description } = req.body;
    
    
    if (!testCategoryId) {
      throw new BadRequestError('Test kategorisi gereklidir');
    }
    
    if (!color) {
      throw new BadRequestError('Renk gereklidir');
    }
    
    if (!name || !name.tr) {
      throw new BadRequestError('Türkçe menü adı gereklidir');
    }
    
    // Check if test category exists
    const testCategory = await TestCategory.findById(testCategoryId);
    if (!testCategory) {
      throw new BadRequestError('Test kategorisi bulunamadı');
    }
    
    
    // Check if menu with this test category already exists
    const existingMenu = await Menu.findOne({ testCategory: testCategoryId });
    
    if (existingMenu) {
      throw new BadRequestError('Bu test kategorisi zaten menüde mevcut');
    }
    
    // Get the next order number if not provided
    let menuOrder = order;
    if (menuOrder === undefined || menuOrder === null) {
      const lastMenu = await Menu.findOne().sort({ order: -1 });
      menuOrder = lastMenu ? lastMenu.order + 1 : 1;
    }
    
    
    const menuData = {
      testCategory: testCategoryId,
      color: color,
      order: menuOrder,
      name: {
        tr: name.tr,
        en: name.en || name.tr, // Fallback to Turkish if not provided
        de: name.de || name.tr, // Fallback to Turkish if not provided
        fr: name.fr || name.tr, // Fallback to Turkish if not provided
      },
      description: {
        tr: description?.tr || '',
        en: description?.en || '',
        de: description?.de || '',
        fr: description?.fr || '',
      }
    };
  
    
    const menu = await Menu.create(menuData);
    
    
    // Populate the testCategory for response
    await menu.populate('testCategory');
    
    res.status(201).json({
      success: true,
      message: 'Menü başarıyla oluşturuldu',
      menu
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Create menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Menü oluşturulurken bir hata oluştu'
    });
  }
};

// Update menu
const updateMenu = async (req, res) => {
  try {
    const { id } = req.params;
    const { testCategoryId, color, order, name, description } = req.body;
    
    const menu = await Menu.findById(id);
    if (!menu) {
      throw new NotFoundError('Menü bulunamadı');
    }
    
    // Update test category if provided
    if (testCategoryId && testCategoryId !== menu.testCategory.toString()) {
      // Check if test category exists
      const testCategory = await TestCategory.findById(testCategoryId);
      if (!testCategory) {
        throw new BadRequestError('Test kategorisi bulunamadı');
      }
      
      // Check if another menu with this test category already exists
      const existingMenu = await Menu.findOne({
        _id: { $ne: id },
        testCategory: testCategoryId
      });
      
      if (existingMenu) {
        throw new BadRequestError('Bu test kategorisi başka bir menüde zaten mevcut');
      }
      
      menu.testCategory = testCategoryId;
    }
    
    if (color !== undefined) menu.color = color;
    if (order !== undefined) menu.order = order;
    
    // Update i18n fields
    if (name) {
      if (name.tr) menu.name.tr = name.tr;
      if (name.en) menu.name.en = name.en;
      if (name.de) menu.name.de = name.de;
      if (name.fr) menu.name.fr = name.fr;
    }
    
    if (description) {
      if (description.tr !== undefined) menu.description.tr = description.tr;
      if (description.en !== undefined) menu.description.en = description.en;
      if (description.de !== undefined) menu.description.de = description.de;
      if (description.fr !== undefined) menu.description.fr = description.fr;
    }
    
    await menu.save();
    await menu.populate('testCategory');
    
    res.status(200).json({
      success: true,
      message: 'Menü başarıyla güncellendi',
      menu
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Update menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Menü güncellenirken bir hata oluştu'
    });
  }
};

// Delete menu
const deleteMenu = async (req, res) => {
  try {
    const { id } = req.params;
    
    const menu = await Menu.findById(id);
    if (!menu) {
      throw new NotFoundError('Menü bulunamadı');
    }
    
    await Menu.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Menü başarıyla silindi'
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Delete menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Menü silinirken bir hata oluştu'
    });
  }
};


// Update menu order
const updateMenuOrder = async (req, res) => {
  try {
    const { menus } = req.body;
    
    if (!Array.isArray(menus)) {
      throw new BadRequestError('Menüler dizisi gereklidir');
    }
    
    // Update each menu's order
    const updatePromises = menus.map(({ id, order }) =>
      Menu.findByIdAndUpdate(id, { order }, { new: true })
    );
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      message: 'Menü sıralaması başarıyla güncellendi'
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Update menu order error:', error);
    res.status(500).json({
      success: false,
      message: 'Menü sıralaması güncellenirken bir hata oluştu'
    });
  }
};

// Clear all menus (for development)
const clearAllMenus = async (req, res) => {
  try {
    // First, delete all documents
    const deleteResult = await Menu.deleteMany({});
    
    // Drop the entire collection to remove all indexes
    try {
      await Menu.collection.drop();
    } catch (dropError) {
      if (dropError.codeName === 'NamespaceNotFound') {
        // Collection was already dropped
      }
    }
    
    // Wait a moment for the drop to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force recreate the collection with only the necessary indexes
    try {
      await Menu.createIndexes();
    } catch (indexError) {
      // Index creation error (continuing)
    }
    
    res.status(200).json({
      success: true,
      message: 'Tüm menüler ve indexler temizlendi, koleksiyon yeniden oluşturuldu'
    });
  } catch (error) {
    console.error('Clear menus error:', error);
    res.status(500).json({
      success: false,
      message: 'Menüler temizlenirken bir hata oluştu'
    });
  }
};

module.exports = {
  getAllMenus,
  getActiveMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  updateMenuOrder,
  clearAllMenus
};