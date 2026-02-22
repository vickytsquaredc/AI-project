const express = require('express');
const router = express.Router();
const {
  listLoans, checkout, returnBook, renewLoan, getOverdueLoans, getLoan
} = require('../controllers/circulationController');
const { authenticate, isLibrarian } = require('../middleware/auth');

router.get('/loans', authenticate, isLibrarian, listLoans);
router.get('/overdue', authenticate, isLibrarian, getOverdueLoans);
router.get('/loan/:id', authenticate, getLoan);
router.post('/checkout', authenticate, isLibrarian, checkout);
router.post('/return', authenticate, isLibrarian, returnBook);
router.post('/renew', authenticate, renewLoan);

module.exports = router;
