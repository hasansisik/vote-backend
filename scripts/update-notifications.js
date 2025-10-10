const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { Test } = require('../models/Test');
const { TestCategory } = require('../models/TestCategory');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/vote-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function updateNotifications() {
  try {
    // Test voted notifications'ları güncelle
    const testVotedNotifications = await Notification.find({ 
      type: 'test_voted',
      'metadata.testId': { $exists: true }
    });

    for (const notification of testVotedNotifications) {
      try {
        const test = await Test.findById(notification.metadata.testId).select('title slug');
        if (test) {
          const testTitle = test.title.tr || test.title.en || 'Bilinmeyen Test';
          
          // Message'ı güncelle
          notification.message = `"${testTitle}" oylamasını tamamladınız.`;
          
          // Metadata'ya testTitle ekle
          if (!notification.metadata) {
            notification.metadata = {};
          }
          notification.metadata.testTitle = testTitle;
          notification.metadata.testSlug = test.slug;
          
          await notification.save();
        }
      } catch (error) {
        console.error(`Test bildirimi güncellenirken hata: ${error.message}`);
      }
    }

    // New vote notifications'ları güncelle
    const newVoteNotifications = await Notification.find({ 
      type: 'new_vote',
      'metadata.categoryId': { $exists: true }
    });


    for (const notification of newVoteNotifications) {
      try {
        const category = await TestCategory.findById(notification.metadata.categoryId).select('name slug');
        if (category) {
          const categoryName = category.name.tr || category.name.en || 'Bilinmeyen Kategori';
          
          // Message'ı güncelle
          notification.message = `"${categoryName}" kategorisinde yeni bir oylama başladı!`;
          
          // Metadata'ya categoryName ekle
          if (!notification.metadata) {
            notification.metadata = {};
          }
          notification.metadata.categoryName = categoryName;
          notification.metadata.categorySlug = category.slug;
          
          await notification.save();
        }
      } catch (error) {
        console.error(`Kategori bildirimi güncellenirken hata: ${error.message}`);
      }
    }

    // Eğer testId yoksa ama testTitle metadata'da varsa, message'ı güncelle
    const notificationsWithTestTitle = await Notification.find({
      type: 'test_voted',
      'metadata.testTitle': { $exists: true, $ne: 'Test' }
    });

    for (const notification of notificationsWithTestTitle) {
      if (notification.message.includes('"Test"')) {
        notification.message = `"${notification.metadata.testTitle}" oylamasını tamamladınız.`;
        await notification.save();
      }
    }

    // Eğer categoryId yoksa ama categoryName metadata'da varsa, message'ı güncelle
    const notificationsWithCategoryName = await Notification.find({
      type: 'new_vote',
      'metadata.categoryName': { $exists: true, $ne: 'Kategori' }
    });

    for (const notification of notificationsWithCategoryName) {
      if (notification.message.includes('"Kategori"')) {
        notification.message = `"${notification.metadata.categoryName}" kategorisinde yeni bir oylama başladı!`;
        await notification.save();
      }
    }

    
  } catch (error) {
    console.error('Bildirimler güncellenirken hata:', error);
  } finally {
    mongoose.connection.close();
  }
}

updateNotifications();
