const mongoose = require("mongoose");

// Option Schema - Test seçenekleri için
const OptionSchema = new mongoose.Schema({
  title: {
    tr: { type: String, required: [true, "Türkçe seçenek başlığı gereklidir"], trim: true },
    en: { type: String, trim: true },
    de: { type: String, trim: true },
    fr: { type: String, trim: true },
  },
  image: { 
    type: String, 
    required: [true, "Seçenek görseli gereklidir"],
    trim: true 
  },
  customFields: [{
    fieldName: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
      fr: { type: String, trim: true },
    },
    fieldValue: {
      tr: { type: String, required: true, trim: true },
      en: { type: String, trim: true },
      de: { type: String, trim: true },
      fr: { type: String, trim: true },
    }
  }],
  votes: { 
    type: Number, 
    default: 0 
  },
  winRate: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

// Test Schema
const TestSchema = new mongoose.Schema({
  title: {
    tr: { type: String, required: [true, "Türkçe test başlığı gereklidir"], trim: true },
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
  coverImage: {
    type: String,
    trim: true
  },
  headerText: {
    tr: { type: String, default: '', trim: true },
    en: { type: String, default: '', trim: true },
    de: { type: String, default: '', trim: true },
    fr: { type: String, default: '', trim: true },
  },
  footerText: {
    tr: { type: String, default: '', trim: true },
    en: { type: String, default: '', trim: true },
    de: { type: String, default: '', trim: true },
    fr: { type: String, default: '', trim: true },
  },
  category: { 
    type: String, 
    required: [true, "Kategori gereklidir"],
    trim: true
  },
  options: [OptionSchema],
  totalVotes: { 
    type: Number, 
    default: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  endDate: {
    type: Date,
    default: null
  },
  trend: { 
    type: Boolean, 
    default: false 
  },
  popular: { 
    type: Boolean, 
    default: false 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  voters: [{
    user: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    votedAt: { 
      type: Date, 
      default: Date.now 
    }
  }],
  // Test istatistikleri
  stats: {
    totalComparisons: { type: Number, default: 0 },
    averageVotesPerOption: { type: Number, default: 0 },
    mostPopularOption: { type: mongoose.Schema.Types.ObjectId, ref: 'Option' }
  }
}, { timestamps: true });

// Index'ler
TestSchema.index({ category: 1, isActive: 1 });
TestSchema.index({ createdAt: -1 });
TestSchema.index({ totalVotes: -1 });

// Virtual field - En popüler seçenek
TestSchema.virtual('topOption').get(function() {
  if (this.options.length === 0) return null;
  return this.options.reduce((prev, current) => 
    (prev.votes > current.votes) ? prev : current
  );
});

// Pre-save middleware - İstatistikleri güncelle ve endDate kontrolü
TestSchema.pre('save', function(next) {
  if (this.options && this.options.length > 0) {
    // Toplam oy sayısını hesapla
    this.totalVotes = this.options.reduce((sum, option) => sum + option.votes, 0);
    
    // En popüler seçeneği bul
    const topOption = this.options.reduce((prev, current) => 
      (prev.votes > current.votes) ? prev : current
    );
    this.stats.mostPopularOption = topOption._id;
    
    // Her seçenek için kazanma oranını hesapla
    this.options.forEach(option => {
      if (this.totalVotes > 0) {
        option.winRate = (option.votes / this.totalVotes) * 100;
      }
    });
    
    // Ortalama oy sayısını hesapla
    this.stats.averageVotesPerOption = this.totalVotes / this.options.length;
  }
  
  // EndDate kontrolü - eğer endDate geçmişse isActive'i false yap
  if (this.endDate && new Date() > this.endDate) {
    this.isActive = false;
  }
  
  next();
});

// Method - Seçenek ekle
TestSchema.methods.addOption = function(optionData) {
  this.options.push(optionData);
  return this.save();
};

// Method - Oy ver
TestSchema.methods.vote = function(optionId, userId) {
  const option = this.options.id(optionId);
  if (!option) {
    throw new Error('Seçenek bulunamadı');
  }
  
  // Kullanıcı daha önce oy vermiş mi kontrol et
  const hasVoted = this.voters.some(voter => 
    voter.user.toString() === userId.toString()
  );
  
  if (hasVoted) {
    throw new Error('Bu teste zaten oy verdiniz');
  }
  
  option.votes += 1;
  this.voters.push({ user: userId });
  this.stats.totalComparisons += 1;
  
  return this.save();
};

// Method - Testi sıfırla (admin için)
TestSchema.methods.resetVotes = function() {
  this.options.forEach(option => {
    option.votes = 0;
    option.winRate = 0;
  });
  this.totalVotes = 0;
  this.voters = [];
  this.stats.totalComparisons = 0;
  this.stats.averageVotesPerOption = 0;
  this.stats.mostPopularOption = null;
  return this.save();
};

// Static method - Kategoriye göre testleri getir
TestSchema.statics.getByCategory = function(category, limit = 10) {
  return this.find({ category, isActive: true })
    .populate('createdBy', 'name surname')
    .sort({ totalVotes: -1 })
    .limit(limit);
};

// Static method - En popüler testleri getir
TestSchema.statics.getPopular = function(limit = 10) {
  return this.find({ isActive: true })
    .populate('createdBy', 'name surname')
    .sort({ totalVotes: -1 })
    .limit(limit);
};

// Static method - Süresi dolmuş testleri otomatik olarak pasif yap
TestSchema.statics.updateExpiredTests = async function() {
  const now = new Date();
  return this.updateMany(
    { 
      endDate: { $lte: now },
      isActive: true 
    },
    { 
      isActive: false 
    }
  );
};

const Test = mongoose.model("Test", TestSchema);

module.exports = { Test, OptionSchema };



