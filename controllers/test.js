const { Test } = require("../models/Test");
const { User } = require("../models/User");
const { TestCategory } = require("../models/TestCategory");
const { StatusCodes } = require("http-status-codes");
const CustomError = require("../errors");
const { sendNewVoteNotification, sendTestVotedNotification } = require("./notification");

// Create Test (Admin only)
const createTest = async (req, res, next) => {
  try {
    const {
      title,
      description,
      coverImage,
      headerText,
      footerText,
      category,
      trend,
      popular,
      endDate,
      options
    } = req.body;

    // Validation
    if (!title || !title.tr || !category) {
      throw new CustomError.BadRequestError("Türkçe başlık ve kategori gereklidir");
    }

    if (!options || options.length < 2) {
      throw new CustomError.BadRequestError("En az 2 seçenek gereklidir");
    }

    // Her seçenek için validation
    for (let option of options) {
      if (!option.title || !option.title.tr || !option.image) {
        throw new CustomError.BadRequestError("Her seçenek için Türkçe başlık ve görsel gereklidir");
      }
      
      // Custom fields validation - sadece dolu olanları kontrol et
      if (option.customFields && Array.isArray(option.customFields)) {
        option.customFields = option.customFields.filter(field => 
          field.fieldName && field.fieldName.tr && field.fieldValue && field.fieldValue.tr && 
          field.fieldName.tr.trim() !== '' && field.fieldValue.tr.trim() !== ''
        );
      }
    }

    const test = new Test({
      title,
      description,
      coverImage,
      headerText,
      footerText,
      category,
      trend: trend || false,
      popular: popular || false,
      endDate: endDate ? new Date(endDate) : null,
      options,
      createdBy: req.user.userId
    });

    await test.save();

    // Kullanıcının oluşturduğu testleri güncelle
    const user = await User.findById(req.user.userId);
    await user.createTest(test._id);

    // Send new vote notification to all users (async, don't wait)
    // Get category info for notification
    const categoryInfo = await TestCategory.findById(category);
    if (categoryInfo) {
      // Get all active users to send notification
      const users = await User.find({ status: 'active', isVerified: true }).select('_id');
      
      // Send notification to each user (in batches to avoid overwhelming)
      const batchSize = 100;
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        const notificationPromises = batch.map(user => 
          sendNewVoteNotification(user._id, {
            testId: test._id,
            categoryId: categoryInfo._id,
            categoryName: categoryInfo.name,
            categorySlug: categoryInfo.slug
          }).catch(console.error)
        );
        await Promise.all(notificationPromises);
      }
    }

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Test başarıyla oluşturuldu",
      test
    });
  } catch (error) {
    next(error);
  }
};

// Get All Tests
const getAllTests = async (req, res, next) => {
  try {
    // Önce süresi dolmuş testleri güncelle
    await Test.updateExpiredTests();
    
    const {
      category,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      isActive
    } = req.query;

    // Build filter - sadece isActive parametresi varsa filtrele
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    const tests = await Test.find(filter)
      .populate('createdBy', 'name surname')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Test.countDocuments(filter);

    res.status(StatusCodes.OK).json({
      success: true,
      tests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Test
const getSingleTest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id)
      .populate('createdBy', 'name surname')
      .populate('voters.user', 'name surname');

    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    // Admin kullanıcılar için aktif olmayan testleri de göster
    // Sadece public istekler için aktif kontrolü yap
    if (!test.isActive && (!req.user || req.user.role !== 'admin')) {
      throw new CustomError.BadRequestError("Bu test aktif değil");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      test
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Test by Slug
const getSingleTestBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const test = await Test.findBySlug(slug)
      .populate('voters.user', 'name surname');

    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    // Admin kullanıcılar için aktif olmayan testleri de göster
    // Sadece public istekler için aktif kontrolü yap
    if (!test.isActive && (!req.user || req.user.role !== 'admin')) {
      throw new CustomError.BadRequestError("Bu test aktif değil");
    }

    res.status(StatusCodes.OK).json({
      success: true,
      test
    });
  } catch (error) {
    next(error);
  }
};

// Vote on Test
const voteOnTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { optionId } = req.body;

    if (!optionId) {
      throw new CustomError.BadRequestError("Seçenek ID gereklidir");
    }

    const test = await Test.findById(id);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    if (!test.isActive) {
      throw new CustomError.BadRequestError("Bu test aktif değil");
    }

    // Kullanıcı giriş yapmış mı kontrol et
    let userId = null;
    if (req.user && req.user.userId) {
      userId = req.user.userId;
    }

    // Seçeneği bul ve oy ver
    const option = test.options.id(optionId);
    if (!option) {
      throw new CustomError.NotFoundError("Seçenek bulunamadı");
    }

    option.votes += 1;
    
    if (userId) {
      // Kullanıcının oy verdiği testleri güncelle
      const user = await User.findById(userId);
      if (user) {
        await user.voteOnTest(test._id, optionId);
        
        // Send test voted notification (async, don't wait)
        sendTestVotedNotification(userId, {
          testId: test._id,
          testTitle: test.title
        }).catch(console.error);
      }
    }

    await test.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Oy başarıyla verildi",
      test: {
        _id: test._id,
        title: test.title,
        totalVotes: test.totalVotes,
        options: test.options
      }
    });
  } catch (error) {
    next(error);
  }
};

// Vote on Test by Slug
const voteOnTestBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { optionId } = req.body;

    if (!optionId) {
      throw new CustomError.BadRequestError("Seçenek ID gereklidir");
    }

    const test = await Test.findBySlug(slug);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    if (!test.isActive) {
      throw new CustomError.BadRequestError("Bu test aktif değil");
    }

    // Kullanıcı giriş yapmış mı kontrol et
    let userId = null;
    if (req.user && req.user.userId) {
      userId = req.user.userId;
    }

    // Seçeneği bul ve oy ver
    const option = test.options.id(optionId);
    if (!option) {
      throw new CustomError.NotFoundError("Seçenek bulunamadı");
    }

    option.votes += 1;
    
    if (userId) {
      // Kullanıcının oy verdiği testleri güncelle
      const user = await User.findById(userId);
      if (user) {
        await user.voteOnTest(test._id, optionId);
        
        // Send test voted notification (async, don't wait)
        sendTestVotedNotification(userId, {
          testId: test._id,
          testTitle: test.title
        }).catch(console.error);
      }
    }

    await test.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Oy başarıyla verildi",
      test: {
        _id: test._id,
        slug: test.slug,
        title: test.title,
        totalVotes: test.totalVotes,
        options: test.options
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Test Results (Ranking) - Updated to use vote sessions
const getTestResults = async (req, res, next) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id)
      .populate('createdBy', 'name surname');

    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    const totalVotes = test.totalVotes || 0;

    // Create results with percentages using test.options.votes
    const results = test.options.map(option => {
      const voteCount = option.votes || 0;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
      
      return {
        _id: option._id,
        title: option.title,
        image: option.image,
        customFields: option.customFields,
        votes: voteCount,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
        winRate: percentage // Use percentage as winRate
      };
    }).sort((a, b) => b.votes - a.votes);

    res.status(StatusCodes.OK).json({
      success: true,
      test: {
        _id: test._id,
        title: test.title,
        description: test.description,
        headerText: test.headerText,
        footerText: test.footerText,
        category: test.category,
        totalVotes: totalVotes,
        createdBy: test.createdBy,
        createdAt: test.createdAt
      },
      results: results.map((result, index) => ({
        rank: index + 1,
        ...result
      })),
      statistics: {
        totalVotes: totalVotes,
        completedSessions: totalVotes,
        userSessions: 0,
        guestSessions: totalVotes
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Test Results by Slug
const getTestResultsBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const test = await Test.findBySlug(slug);

    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    const totalVotes = test.totalVotes || 0;

    // Create results with percentages using test.options.votes
    const results = test.options.map(option => {
      const voteCount = option.votes || 0;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
      
      return {
        _id: option._id,
        title: option.title,
        image: option.image,
        customFields: option.customFields,
        votes: voteCount,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal place
        winRate: percentage // Use percentage as winRate
      };
    }).sort((a, b) => b.votes - a.votes);

    res.status(StatusCodes.OK).json({
      success: true,
      test: {
        _id: test._id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        headerText: test.headerText,
        footerText: test.footerText,
        category: test.category,
        totalVotes: totalVotes,
        createdBy: test.createdBy,
        createdAt: test.createdAt
      },
      results: results.map((result, index) => ({
        rank: index + 1,
        ...result
      })),
      statistics: {
        totalVotes: totalVotes,
        completedSessions: totalVotes,
        userSessions: 0,
        guestSessions: totalVotes
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Popular Tests
const getPopularTests = async (req, res, next) => {
  try {
    // Önce süresi dolmuş testleri güncelle
    await Test.updateExpiredTests();
    
    const { limit = 10, category } = req.query;

    const filter = { isActive: true, popular: true };
    if (category) filter.category = category;

    const tests = await Test.find(filter)
      .populate('createdBy', 'name surname')
      .sort({ totalVotes: -1 })
      .limit(parseInt(limit));

    res.status(StatusCodes.OK).json({
      success: true,
      tests: tests.map(test => ({
        _id: test._id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        coverImage: test.coverImage,
        category: test.category,
        totalVotes: test.totalVotes,
        createdBy: test.createdBy,
        topOption: test.topOption,
        createdAt: test.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Get Tests by Category
const getTestsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const skip = (page - 1) * limit;

    const tests = await Test.find({ 
      category, 
      isActive: true 
    })
      .populate('createdBy', 'name surname')
      .sort({ totalVotes: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Test.countDocuments({ 
      category, 
      isActive: true 
    });

    res.status(StatusCodes.OK).json({
      success: true,
      tests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get Tests by Category Slug
const getTestsByCategorySlug = async (req, res, next) => {
  try {
    // Önce süresi dolmuş testleri güncelle
    await Test.updateExpiredTests();
    
    const { slug } = req.params;
    const { limit = 20, page = 1 } = req.query;

    // Önce TestCategory'den slug'a göre kategori bul
    const category = await TestCategory.findOne({ slug });
    
    if (!category) {
      throw new CustomError.NotFoundError("Kategori bulunamadı");
    }

    const skip = (page - 1) * limit;

    // Bu kategoriye ait testleri getir (ObjectId ile)
    const tests = await Test.find({ 
      category: category._id, 
      isActive: true 
    })
      .populate('createdBy', 'name surname')
      .populate('category', 'name slug')
      .sort({ totalVotes: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Test.countDocuments({ 
      category: category._id, 
      isActive: true 
    });

    res.status(StatusCodes.OK).json({
      success: true,
      category: {
        _id: category._id,
        name: category.name,
        slug: category.slug
      },
      tests: tests.map(test => ({
        _id: test._id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        coverImage: test.coverImage,
        category: {
          _id: category._id,
          name: category.name
        },
        totalVotes: test.totalVotes,
        options: test.options,
        createdBy: test.createdBy,
        createdAt: test.createdAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update Test (Admin only)
const updateTest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const test = await Test.findById(id);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    // Sadece test sahibi veya admin güncelleyebilir
    if (test.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      throw new CustomError.UnauthorizedError("Bu testi güncelleme yetkiniz yok");
    }

    // Güncellenebilir alanlar
    const allowedUpdates = [
      'title', 'description', 'coverImage', 'headerText', 'footerText', 'category', 'isActive', 'trend', 'popular', 'endDate'
    ];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        if (field === 'endDate') {
          test[field] = updates[field] ? new Date(updates[field]) : null;
        } else {
          test[field] = updates[field];
        }
      }
    });

    // Options alanını güncelle (mevcut oyları koruyarak)
    if (updates.options && Array.isArray(updates.options)) {
      // Mevcut options ile yeni options'ı merge et
      const existingOptions = test.options || [];
      
      updates.options.forEach((newOption, index) => {
        // Custom fields validation - sadece dolu olanları al
        const cleanedCustomFields = newOption.customFields && Array.isArray(newOption.customFields) 
          ? newOption.customFields.filter(field => 
              field.fieldName && field.fieldName.tr && field.fieldValue && field.fieldValue.tr && 
              field.fieldName.tr.trim() !== '' && field.fieldValue.tr.trim() !== ''
            )
          : [];
        
        if (existingOptions[index]) {
          // Mevcut option varsa, sadece title, image ve customFields'i güncelle
          existingOptions[index].title = newOption.title;
          existingOptions[index].image = newOption.image;
          existingOptions[index].customFields = cleanedCustomFields;
          // votes ve winRate'i koru
        } else {
          // Yeni option ekle
          existingOptions.push({
            title: newOption.title,
            image: newOption.image,
            customFields: cleanedCustomFields,
            votes: 0,
            winRate: 0
          });
        }
      });
      
      // Fazla options varsa kırp
      if (existingOptions.length > updates.options.length) {
        existingOptions.splice(updates.options.length);
      }
      
      test.options = existingOptions;
    }

    await test.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Test başarıyla güncellendi",
      test
    });
  } catch (error) {
    next(error);
  }
};

// Delete Test (Admin only)
const deleteTest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    // Sadece test sahibi veya admin silebilir
    if (test.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      throw new CustomError.UnauthorizedError("Bu testi silme yetkiniz yok");
    }

    await Test.findByIdAndDelete(id);

    // Kullanıcının oluşturduğu testlerden çıkar
    await User.updateMany(
      { createdTests: id },
      { $pull: { createdTests: id } }
    );

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Test başarıyla silindi"
    });
  } catch (error) {
    next(error);
  }
};

// Reset Test Votes (Admin only)
const resetTestVotes = async (req, res, next) => {
  try {
    const { id } = req.params;

    const test = await Test.findById(id);
    if (!test) {
      throw new CustomError.NotFoundError("Test bulunamadı");
    }

    // Sadece test sahibi veya admin sıfırlayabilir
    if (test.createdBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      throw new CustomError.UnauthorizedError("Bu testi sıfırlama yetkiniz yok");
    }

    await test.resetVotes();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Test oyları başarıyla sıfırlandı",
      test
    });
  } catch (error) {
    next(error);
  }
};

// Get User's Voted Tests
const getUserVotedTests = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate({
        path: 'votedTests.test',
        populate: {
          path: 'createdBy',
          select: 'name surname'
        }
      });

    if (!user) {
      throw new CustomError.NotFoundError("Kullanıcı bulunamadı");
    }

    // Get detailed test information with options
    const votedTestsWithDetails = await Promise.all(
      user.votedTests.map(async (vote) => {
        const test = await Test.findById(vote.test._id)
          .populate('createdBy', 'name surname')
          .select('slug title description category coverImage totalVotes options createdAt');
        
        if (!test) return null;

        // Find the selected option
        const selectedOption = test.options.find(option => 
          option._id.toString() === vote.selectedOption.toString()
        );

        return {
          _id: vote._id,
          test: {
            _id: test._id,
            slug: test.slug,
            title: test.title,
            description: test.description,
            category: test.category,
            coverImage: test.coverImage,
            totalVotes: test.totalVotes,
            createdBy: test.createdBy,
            createdAt: test.createdAt
          },
          selectedOption: selectedOption ? {
            _id: selectedOption._id,
            title: selectedOption.title,
            image: selectedOption.image,
            customFields: selectedOption.customFields
          } : null,
          votedAt: vote.votedAt
        };
      })
    );

    // Filter out null results (deleted tests)
    const validVotedTests = votedTestsWithDetails.filter(test => test !== null);

    res.status(StatusCodes.OK).json({
      success: true,
      votedTests: validVotedTests,
      totalVotes: user.testStats.totalVotes,
      userStats: user.testStats
    });
  } catch (error) {
    next(error);
  }
};


// Get Trend Tests
const getTrendTests = async (req, res, next) => {
  try {
    // Önce süresi dolmuş testleri güncelle
    await Test.updateExpiredTests();
    
    const { limit = 5 } = req.query;

    // Trend olan aktif testleri getir
    const trendTests = await Test.find({ 
      isActive: true, 
      trend: true 
    })
      .populate('createdBy', 'name surname')
      .sort({ totalVotes: -1, createdAt: -1 })
      .limit(parseInt(limit));

    res.status(StatusCodes.OK).json({
      success: true,
      tests: trendTests.map(test => ({
        _id: test._id,
        slug: test.slug,
        title: test.title,
        description: test.description,
        coverImage: test.coverImage,
        category: test.category,
        totalVotes: test.totalVotes,
        trend: test.trend,
        popular: test.popular,
        createdBy: test.createdBy,
        createdAt: test.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Get Global Rankings
const getGlobalRankings = async (req, res, next) => {
  try {
    const { category, limit = 50 } = req.query;

    const filter = { isActive: true };
    if (category) filter.category = category;

    // En popüler testleri getir
    const popularTests = await Test.find(filter)
      .populate('createdBy', 'name surname')
      .sort({ totalVotes: -1 })
      .limit(parseInt(limit));

    // Kategori istatistikleri
    const categoryStats = await Test.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          totalTests: { $sum: 1 },
          totalVotes: { $sum: '$totalVotes' },
          avgVotes: { $avg: '$totalVotes' }
        }
      },
      { $sort: { totalVotes: -1 } }
    ]);

    res.status(StatusCodes.OK).json({
      success: true,
      popularTests: popularTests.map(test => ({
        _id: test._id,
        title: test.title,
        category: test.category,
        totalVotes: test.totalVotes,
        createdBy: test.createdBy,
        topOption: test.topOption,
        createdAt: test.createdAt
      })),
      categoryStats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTest,
  getAllTests,
  getSingleTest,
  getSingleTestBySlug,
  voteOnTest,
  voteOnTestBySlug,
  getTestResults,
  getTestResultsBySlug,
  getPopularTests,
  getTestsByCategory,
  getTestsByCategorySlug,
  updateTest,
  deleteTest,
  resetTestVotes,
  getUserVotedTests,
  getTrendTests,
  getGlobalRankings
};

// Get Global Statistics
const getGlobalStats = async (req, res, next) => {
  try {
    // Toplam test sayısı
    const totalTests = await Test.countDocuments({ isActive: true });
    
    // Toplam oy sayısı (tüm testlerdeki toplam oy)
    const tests = await Test.find({ isActive: true });
    const totalVotes = tests.reduce((sum, test) => sum + (test.totalVotes || 0), 0);
    
    // Toplam kullanıcı sayısı (tüm kullanıcılar)
    const totalUsers = await User.countDocuments();
    
    res.status(StatusCodes.OK).json({
      success: true,
      stats: {
        totalTests,
        totalVotes,
        totalUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export getGlobalStats
module.exports.getGlobalStats = getGlobalStats;




