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

// Get all test categories (public)
const getAllTestCategories = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const categories = await TestCategory.find({})
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await TestCategory.countDocuments({});
    
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

// Get all test categories (public) - renamed from getActiveTestCategories
const getActiveTestCategories = async (req, res) => {
  try {
    const categories = await TestCategory.find({})
      .sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    console.error('Get test categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Test kategorileri getirilirken bir hata oluştu'
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
    const { name, description } = req.body;
    
    console.log('Creating test category with data:', { name, description });
    
    if (!name || !name.tr) {
      throw new BadRequestError('Türkçe kategori adı gereklidir');
    }
    
    // Generate slug from Turkish name
    const slug = generateSlug(name.tr);
    
    // Check if category with same name or slug already exists
    const existingCategory = await TestCategory.findOne({
      $or: [
        { 'name.tr': name.tr },
        { slug }
      ]
    });
    
    if (existingCategory) {
      throw new BadRequestError('Bu isimde veya slug\'da bir kategori zaten mevcut');
    }
    
    const categoryData = {
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
      },
      slug
    };
    
    console.log('Creating category with data:', categoryData);
    
    const category = await TestCategory.create(categoryData);
    
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
    const { name, description } = req.body;
    
    const category = await TestCategory.findById(id);
    if (!category) {
      throw new NotFoundError('Test kategorisi bulunamadı');
    }
    
    // Update name fields
    if (name) {
      // Check if any name is being changed
      const nameChanged = name.tr !== category.name.tr || 
                         name.en !== category.name.en || 
                         name.de !== category.name.de || 
                         name.fr !== category.name.fr;
      
      if (nameChanged) {
        // Check if new Turkish name already exists
        const existingCategory = await TestCategory.findOne({
          _id: { $ne: id },
          'name.tr': name.tr
        });
        
        if (existingCategory) {
          throw new BadRequestError('Bu isimde başka bir kategori zaten mevcut');
        }
        
        // Update names
        if (name.tr) category.name.tr = name.tr;
        if (name.en) category.name.en = name.en;
        if (name.de) category.name.de = name.de;
        if (name.fr) category.name.fr = name.fr;
        
        // Generate new slug from Turkish name
        const newSlug = generateSlug(name.tr);
        category.slug = newSlug;
      }
    }
    
    // Update description fields
    if (description) {
      if (description.tr !== undefined) category.description.tr = description.tr;
      if (description.en !== undefined) category.description.en = description.en;
      if (description.de !== undefined) category.description.de = description.de;
      if (description.fr !== undefined) category.description.fr = description.fr;
    }
    
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
    const testsUsingCategory = await Test.countDocuments ? await Test.countDocuments({ category: category.slug }) : 0;
    
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


module.exports = {
  getAllTestCategories,
  getActiveTestCategories,
  getTestCategory,
  createTestCategory,
  updateTestCategory,
  deleteTestCategory
};
