const express = require('express');
const {
  getAllMenus,
  getActiveMenus,
  getMenu,
  createMenu,
  updateMenu,
  deleteMenu,
  toggleMenuStatus,
  updateMenuOrder,
  clearAllMenus
} = require('../controllers/menu');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllMenus);
router.get('/active', getActiveMenus);

// Protected routes (require authentication)
router.get('/:id', isAuthenticated, getMenu);

// Admin only routes
router.post('/', isAuthenticated, isAdmin, createMenu);
router.put('/:id', isAuthenticated, isAdmin, updateMenu);
router.delete('/:id', isAuthenticated, isAdmin, deleteMenu);
router.patch('/:id/toggle-status', isAuthenticated, isAdmin, toggleMenuStatus);
router.patch('/update-order', isAuthenticated, isAdmin, updateMenuOrder);
router.delete('/clear-all', isAuthenticated, isAdmin, clearAllMenus);

module.exports = router;
