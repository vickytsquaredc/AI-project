const express = require('express');
const router = express.Router();
const {
  listFines, payFine, waiveFine, payAllFines, issueFine
} = require('../controllers/finesController');
const { authenticate, isLibrarian } = require('../middleware/auth');

router.get('/', authenticate, isLibrarian, listFines);
router.post('/issue', authenticate, isLibrarian, issueFine);
router.post('/pay-all/:userId', authenticate, isLibrarian, payAllFines);
router.post('/:id/pay', authenticate, isLibrarian, payFine);
router.post('/:id/waive', authenticate, isLibrarian, waiveFine);

module.exports = router;
