const express = require('express');
const {
  createMenu,
  getAllMenus,
  getMainMenus,
  getSingleMenu,
  updateMenu,
  deleteMenu,
  toggleMenuActive,
  updateMenuOrder,
  bulkUpdateMenuOrder,
  getMenuStats
} = require('../controllers/menu');
const { isAuthenticated, isAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.get('/', getAllMenus);
router.get('/main', getMainMenus);
router.get('/stats', getMenuStats);
router.get('/:id', getSingleMenu);

// Admin only routes
router.post('/', isAuthenticated, isAdmin, createMenu);
router.patch('/:id', isAuthenticated, isAdmin, updateMenu);
router.delete('/:id', isAuthenticated, isAdmin, deleteMenu);
router.patch('/:id/toggle', isAuthenticated, isAdmin, toggleMenuActive);
router.patch('/:id/order', isAuthenticated, isAdmin, updateMenuOrder);
router.patch('/bulk/order', isAuthenticated, isAdmin, bulkUpdateMenuOrder);

module.exports = router;
