const express = require('express');
const {
  getAllTestCategories,
  getActiveTestCategories,
  getTestCategory,
  createTestCategory,
  updateTestCategory,
  deleteTestCategory,
  toggleTestCategoryStatus,
  updateTestCategoryOrder
} = require('../controllers/testCategory');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllTestCategories);
router.get('/active', getActiveTestCategories);

// Protected routes (require authentication)
router.get('/:id', isAuthenticated, getTestCategory);

// Admin only routes
router.post('/', isAuthenticated, isAdmin, createTestCategory);
router.put('/:id', isAuthenticated, isAdmin, updateTestCategory);
router.delete('/:id', isAuthenticated, isAdmin, deleteTestCategory);
router.patch('/:id/toggle-status', isAuthenticated, isAdmin, toggleTestCategoryStatus);
router.patch('/update-order', isAuthenticated, isAdmin, updateTestCategoryOrder);

module.exports = router;
