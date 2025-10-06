const express = require('express');
const {
  createTest,
  getAllTests,
  getSingleTest,
  voteOnTest,
  getTestResults,
  getPopularTests,
  getTestsByCategory,
  updateTest,
  deleteTest,
  resetTestVotes,
  getUserVotedTests,
  getUserCreatedTests,
  getGlobalRankings
} = require('../controllers/test');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllTests);
router.get('/popular', getPopularTests);
router.get('/rankings', getGlobalRankings);
router.get('/category/:category', getTestsByCategory);
router.get('/:id', getSingleTest);
router.get('/:id/results', getTestResults);
router.post('/:id/vote', voteOnTest);

// Authenticated routes
router.get('/user/voted', isAuthenticated, getUserVotedTests);
router.get('/user/created', isAuthenticated, isAdmin, getUserCreatedTests);

// Admin only routes
router.post('/', isAuthenticated, isAdmin, createTest);
router.patch('/:id', isAuthenticated, isAdmin, updateTest);
router.delete('/:id', isAuthenticated, isAdmin, deleteTest);
router.post('/:id/reset', isAuthenticated, isAdmin, resetTestVotes);

module.exports = router;



