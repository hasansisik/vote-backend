const mongoose = require("mongoose");

// Option Schema - Test seçenekleri için
const OptionSchema = new mongoose.Schema({
  title: {
    tr: { type: String, trim: true },
    en: { type: String, required: [true, "English option title is required"], trim: true },
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
    tr: { type: String, trim: true },
    en: { type: String, required: [true, "English test title is required"], trim: true },
    de: { type: String, trim: true },
    fr: { type: String, trim: true },
  },
  slug: {
    tr: { type: String, trim: true, lowercase: true },
    en: { type: String, trim: true, lowercase: true },
    de: { type: String, trim: true, lowercase: true },
    fr: { type: String, trim: true, lowercase: true },
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
  categories: [{ 
    type: String, 
    required: [true, "En az bir kategori gereklidir"],
    trim: true
  }],
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
  },
  // Vote sessions
  voteSessions: [{
    sessionId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isGuest: { type: Boolean, default: true },
    currentPair: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Option' }],
    remainingOptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Option' }],
    winners: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Option' }],
    finalWinner: { type: mongoose.Schema.Types.ObjectId, ref: 'Option', default: null },
    isComplete: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null }
  }]
}, { timestamps: true });

// Index'ler
TestSchema.index({ categories: 1, isActive: 1 });
TestSchema.index({ createdAt: -1 });
TestSchema.index({ totalVotes: -1 });
TestSchema.index({ 'slug.tr': 1 });
TestSchema.index({ 'slug.en': 1 });
TestSchema.index({ 'slug.de': 1 });
TestSchema.index({ 'slug.fr': 1 });

// Slug generation function
const generateSlug = (title, language = 'tr') => {
  if (!title) return '';
  
  let processedTitle = title.toLowerCase();
  
  // Language-specific character replacements
  if (language === 'tr') {
    processedTitle = processedTitle
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ç/g, 'c')
      .replace(/İ/g, 'i')
      .replace(/Ğ/g, 'g')
      .replace(/Ü/g, 'u')
      .replace(/Ş/g, 's')
      .replace(/Ö/g, 'o')
      .replace(/Ç/g, 'c');
  } else if (language === 'de') {
    processedTitle = processedTitle
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/Ä/g, 'ae')
      .replace(/Ö/g, 'oe')
      .replace(/Ü/g, 'ue');
  } else if (language === 'fr') {
    processedTitle = processedTitle
      .replace(/à/g, 'a')
      .replace(/á/g, 'a')
      .replace(/â/g, 'a')
      .replace(/ä/g, 'a')
      .replace(/è/g, 'e')
      .replace(/é/g, 'e')
      .replace(/ê/g, 'e')
      .replace(/ë/g, 'e')
      .replace(/ì/g, 'i')
      .replace(/í/g, 'i')
      .replace(/î/g, 'i')
      .replace(/ï/g, 'i')
      .replace(/ò/g, 'o')
      .replace(/ó/g, 'o')
      .replace(/ô/g, 'o')
      .replace(/ö/g, 'o')
      .replace(/ù/g, 'u')
      .replace(/ú/g, 'u')
      .replace(/û/g, 'u')
      .replace(/ü/g, 'u')
      .replace(/ý/g, 'y')
      .replace(/ÿ/g, 'y')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      .replace(/À/g, 'a')
      .replace(/Á/g, 'a')
      .replace(/Â/g, 'a')
      .replace(/Ä/g, 'a')
      .replace(/È/g, 'e')
      .replace(/É/g, 'e')
      .replace(/Ê/g, 'e')
      .replace(/Ë/g, 'e')
      .replace(/Ì/g, 'i')
      .replace(/Í/g, 'i')
      .replace(/Î/g, 'i')
      .replace(/Ï/g, 'i')
      .replace(/Ò/g, 'o')
      .replace(/Ó/g, 'o')
      .replace(/Ô/g, 'o')
      .replace(/Ö/g, 'o')
      .replace(/Ù/g, 'u')
      .replace(/Ú/g, 'u')
      .replace(/Û/g, 'u')
      .replace(/Ü/g, 'u')
      .replace(/Ý/g, 'y')
      .replace(/Ÿ/g, 'y')
      .replace(/Ñ/g, 'n')
      .replace(/Ç/g, 'c');
  }
  
  return processedTitle
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Virtual field - En popüler seçenek
TestSchema.virtual('topOption').get(function() {
  if (this.options.length === 0) return null;
  return this.options.reduce((prev, current) => 
    (prev.votes > current.votes) ? prev : current
  );
});

// Pre-save middleware - İstatistikleri güncelle, slug oluştur ve endDate kontrolü
TestSchema.pre('save', async function(next) {
  // Multilingual slug oluştur - slug yoksa, yeni test oluşturulurken veya title değiştiğinde
  if (!this.slug || this.isNew || this.isModified('title')) {
    const languages = ['tr', 'en', 'de', 'fr'];
    const newSlugs = {};
    
    for (const lang of languages) {
      if (this.title[lang]) {
        let baseSlug = generateSlug(this.title[lang], lang);
        let slug = baseSlug;
        let counter = 1;
        
        // Aynı slug varsa sayı ekle
        while (true) {
          const existingTest = await this.constructor.findOne({ 
            [`slug.${lang}`]: slug 
          });
          if (!existingTest || existingTest._id.toString() === this._id.toString()) {
            break;
          }
          slug = `${baseSlug}-${counter}`;
          counter++;
        }
        
        newSlugs[lang] = slug;
      }
    }
    
    this.slug = newSlugs;
  }
  
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
  
  // EndDate ve isActive kontrolü
  if (this.endDate && new Date() > this.endDate) {
    // Eğer endDate geçmişse ve test aktif edilmeye çalışılıyorsa, endDate'i tamamen kaldır
    if (this.isActive && this.isModified('isActive')) {
      this.endDate = undefined;
    } else if (!this.isModified('isActive')) {
      // Eğer isActive değiştirilmemişse ve endDate geçmişse, testi pasif yap
      this.isActive = false;
    }
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
  return this.find({ categories: category, isActive: true })
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

// Static method - Slug'a göre test bul (multilingual)
TestSchema.statics.findBySlug = function(slug, language = 'tr') {
  return this.findOne({ [`slug.${language}`]: slug }).populate('createdBy', 'name surname');
};

// Method - Vote session başlat
TestSchema.methods.startVoteSession = function(sessionId, userId) {
  const session = {
    sessionId,
    userId: userId || null,
    isGuest: !userId,
    currentPair: [],
    remainingOptions: [],
    winners: [],
    finalWinner: null,
    isComplete: false,
    startedAt: new Date(),
    completedAt: null
  };
  
  this.voteSessions.push(session);
  return this.save();
};

// Method - Vote session güncelle
TestSchema.methods.updateVoteSession = function(sessionId, selectedOptionId) {
  const session = this.voteSessions.find(s => s.sessionId === sessionId);
  if (!session) {
    throw new Error('Vote session bulunamadı');
  }
  
  if (session.isComplete) {
    throw new Error('Bu vote session zaten tamamlanmış');
  }
  
  // Seçilen seçeneği kazanan olarak işaretle
  const selectedOption = this.options.id(selectedOptionId);
  if (!selectedOption) {
    throw new Error('Seçenek bulunamadı');
  }
  
  // Eğer ilk karşılaştırmaysa, currentPair'i ayarla
  if (session.currentPair.length === 0) {
    // Test mantığı: Sabit bir oylama sistemi
    const shuffled = [...this.options].sort((a, b) => {
      const testIdHash = this._id.toString().slice(-4);
      const aHash = a._id.toString().slice(-4);
      const bHash = b._id.toString().slice(-4);
      return (testIdHash + aHash).localeCompare(testIdHash + bHash);
    });
    
    session.currentPair = [shuffled[0]._id, shuffled[1]._id];
    session.remainingOptions = shuffled.slice(2).map(opt => opt._id);
  }
  
  // Seçilen seçeneği kazanan olarak işaretle
  session.winners.push(selectedOptionId);
  
  // Eğer hala kullanılacak seçenekler varsa
  if (session.remainingOptions.length > 0) {
    const nextOption = session.remainingOptions[0];
    session.currentPair = [selectedOptionId, nextOption];
    session.remainingOptions = session.remainingOptions.slice(1);
  } else {
    // Tüm seçenekler tükendi - final kazanan
    session.finalWinner = selectedOptionId;
    session.isComplete = true;
    session.completedAt = new Date();
    
    // Test'in genel oy sayısını güncelle
    selectedOption.votes += 1;
    this.totalVotes += 1;
  }
  
  return this.save();
};

// Method - Vote session sil
TestSchema.methods.deleteVoteSession = function(sessionId) {
  this.voteSessions = this.voteSessions.filter(s => s.sessionId !== sessionId);
  return this.save();
};

// Method - Vote session getir
TestSchema.methods.getVoteSession = function(sessionId) {
  return this.voteSessions.find(s => s.sessionId === sessionId);
};

const Test = mongoose.model("Test", TestSchema);

module.exports = { Test, OptionSchema };



