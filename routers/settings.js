const express = require('express');
const {
  getSettings,
  getEnabledLanguages,
  getHomePageHtmlContent,
  updateSettings,
  toggleLanguage,
  updateDefaultLanguage,
} = require('../controllers/settings');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/languages', getEnabledLanguages);
router.get('/homepage-content', getHomePageHtmlContent);

// Admin only routes
router.get('/', isAuthenticated, isAdmin, getSettings);
router.put('/', isAuthenticated, isAdmin, updateSettings);
router.patch('/language/:languageCode', isAuthenticated, isAdmin, toggleLanguage);
router.patch('/default-language', isAuthenticated, isAdmin, updateDefaultLanguage);

module.exports = router;

