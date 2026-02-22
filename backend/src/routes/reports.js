const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getInventoryReport, getOverdueReport,
  getFinesReport, getCirculationReport,
  getNotifications, markNotificationRead,
  getSettings, updateSettings
} = require('../controllers/reportsController');
const { authenticate, isLibrarian, isAdmin } = require('../middleware/auth');

router.get('/dashboard', authenticate, isLibrarian, getDashboardStats);
router.get('/inventory', authenticate, isLibrarian, getInventoryReport);
router.get('/overdue', authenticate, isLibrarian, getOverdueReport);
router.get('/fines', authenticate, isLibrarian, getFinesReport);
router.get('/circulation', authenticate, isLibrarian, getCirculationReport);
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/:id/read', authenticate, markNotificationRead);
router.get('/settings', authenticate, getSettings);
router.put('/settings', authenticate, isAdmin, updateSettings);

module.exports = router;
