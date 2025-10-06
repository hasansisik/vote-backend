const TestCategory = require('../models/TestCategory');
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

// Get all test categories (public)
const getAllTestCategories = async (req, res) => {
  try {
    const { active, page = 1, limit = 50, sort = 'order' } = req.query;
    
    const query = {};
    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const categories = await TestCategory.find(query)
      .sort({ [sort]: 1, name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await TestCategory.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: categories.length,
      total,
      categories
    });
  } catch (error) {
    console.error('Get all test categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategorileri getirilirken bir hata oluştu'
    });
  }
};

// Get active test categories (public)
const getActiveTestCategories = async (req, res) => {
  try {
    const categories = await TestCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('Get active test categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Aktif test kategorileri getirilirken bir hata oluştu'
    });
  }
};

// Get single test category
const getTestCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await TestCategory.findById(id);
    if (!category) {
      throw new NotFoundError('Test kategorisi bulunamadı');
    }
    
    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Get test category error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategorisi getirilirken bir hata oluştu'
    });
  }
};

// Create test category (Admin only)
const createTestCategory = async (req, res) => {
  try {
    const { name, description, color, icon, order } = req.body;
    
    if (!name || !color) {
      throw new BadRequestError('Kategori adı ve rengi gereklidir');
    }
    
    // Generate slug from name
    const slug = generateSlug(name);
    
    // Check if category with same name or slug already exists
    const existingCategory = await TestCategory.findOne({
      $or: [{ name }, { slug }]
    });
    
    if (existingCategory) {
      throw new BadRequestError('Bu isimde veya slug\'da bir kategori zaten mevcut');
    }
    
    // Get the next order number if not provided
    let categoryOrder = order;
    if (!categoryOrder) {
      const lastCategory = await TestCategory.findOne().sort({ order: -1 });
      categoryOrder = lastCategory ? lastCategory.order + 1 : 1;
    }
    
    const category = await TestCategory.create({
      name,
      slug,
      description,
      color,
      icon,
      order: categoryOrder,
      isActive: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Test kategorisi başarıyla oluşturuldu',
      category
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Create test category error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategorisi oluşturulurken bir hata oluştu'
    });
  }
};

// Update test category (Admin only)
const updateTestCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon, isActive, order } = req.body;
    
    const category = await TestCategory.findById(id);
    if (!category) {
      throw new NotFoundError('Test kategorisi bulunamadı');
    }
    
    // Generate new slug if name is being updated
    if (name && name !== category.name) {
      const newSlug = generateSlug(name);
      
      // Check if new slug already exists
      const existingCategory = await TestCategory.findOne({
        _id: { $ne: id },
        $or: [{ name }, { slug: newSlug }]
      });
      
      if (existingCategory) {
        throw new BadRequestError('Bu isimde veya slug\'da başka bir kategori zaten mevcut');
      }
      
      category.name = name;
      category.slug = newSlug;
    }
    
    if (description !== undefined) category.description = description;
    if (color !== undefined) category.color = color;
    if (icon !== undefined) category.icon = icon;
    if (isActive !== undefined) category.isActive = isActive;
    if (order !== undefined) category.order = order;
    
    await category.save();
    
    res.status(200).json({
      success: true,
      message: 'Test kategorisi başarıyla güncellendi',
      category
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
    
    console.error('Update test category error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategorisi güncellenirken bir hata oluştu'
    });
  }
};

// Delete test category (Admin only)
const deleteTestCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await TestCategory.findById(id);
    if (!category) {
      throw new NotFoundError('Test kategorisi bulunamadı');
    }
    
    // Check if category is being used by any tests
    const Test = require('../models/Test');
    const testsUsingCategory = await Test.countDocuments({ category: category.slug });
    
    if (testsUsingCategory > 0) {
      throw new BadRequestError(`Bu kategori ${testsUsingCategory} test tarafından kullanılıyor. Önce bu testleri silin veya kategorilerini değiştirin.`);
    }
    
    await TestCategory.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Test kategorisi başarıyla silindi'
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
    
    console.error('Delete test category error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategorisi silinirken bir hata oluştu'
    });
  }
};

// Toggle test category status (Admin only)
const toggleTestCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await TestCategory.findById(id);
    if (!category) {
      throw new NotFoundError('Test kategorisi bulunamadı');
    }
    
    category.isActive = !category.isActive;
    await category.save();
    
    res.status(200).json({
      success: true,
      message: `Test kategorisi ${category.isActive ? 'aktif' : 'pasif'} hale getirildi`,
      category
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Toggle test category status error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategori durumu değiştirilirken bir hata oluştu'
    });
  }
};

// Update test category order (Admin only)
const updateTestCategoryOrder = async (req, res) => {
  try {
    const { categories } = req.body;
    
    if (!Array.isArray(categories)) {
      throw new BadRequestError('Kategoriler dizisi gereklidir');
    }
    
    // Update each category's order
    const updatePromises = categories.map(({ id, order }) =>
      TestCategory.findByIdAndUpdate(id, { order }, { new: true })
    );
    
    await Promise.all(updatePromises);
    
    res.status(200).json({
      success: true,
      message: 'Test kategori sıralaması başarıyla güncellendi'
    });
  } catch (error) {
    if (error instanceof BadRequestError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    console.error('Update test category order error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategori sıralaması güncellenirken bir hata oluştu'
    });
  }
};

module.exports = {
  getAllTestCategories,
  getActiveTestCategories,
  getTestCategory,
  createTestCategory,
  updateTestCategory,
  deleteTestCategory,
  toggleTestCategoryStatus,
  updateTestCategoryOrder
};
