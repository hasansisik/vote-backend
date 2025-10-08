const express = require('express');
const {
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
  getGlobalRankings,
  getGlobalStats,
  cleanExpiredEndDates
} = require('../controllers/test');
const { isAuthenticated, isAdmin, isOptionalAuthenticated } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllTests);
router.get('/popular', getPopularTests);
router.get('/trend', getTrendTests);
router.get('/rankings', getGlobalRankings);
router.get('/stats', getGlobalStats);
router.get('/category/:category', getTestsByCategory);
router.get('/category-slug/:slug', getTestsByCategorySlug);

// Slug-based routes (must come before ID-based routes)
router.get('/slug/:slug', isOptionalAuthenticated, getSingleTestBySlug);
router.get('/slug/:slug/results', getTestResultsBySlug);
router.post('/slug/:slug/vote', isOptionalAuthenticated, voteOnTestBySlug);

// ID-based routes (legacy support)
router.get('/:id', isOptionalAuthenticated, getSingleTest);
router.get('/:id/results', getTestResults);
router.post('/:id/vote', isOptionalAuthenticated, voteOnTest);

// Authenticated routes
router.get('/user/voted', isAuthenticated, getUserVotedTests);

// Admin only routes
router.post('/', isAuthenticated, isAdmin, createTest);
router.patch('/:id', isAuthenticated, isAdmin, updateTest);
router.delete('/:id', isAuthenticated, isAdmin, deleteTest);
router.post('/:id/reset', isAuthenticated, isAdmin, resetTestVotes);
router.post('/clean-expired-dates', isAuthenticated, isAdmin, cleanExpiredEndDates);

module.exports = router;



