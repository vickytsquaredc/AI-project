const express = require('express');
const router = express.Router();
const {
  listMembers, getMember, getMemberLoans, getMemberFines, getMemberReservations,
  createMember, updateMember, resetMemberPassword, getMemberByBarcode
} = require('../controllers/membersController');
const { authenticate, isLibrarian } = require('../middleware/auth');

router.get('/', authenticate, isLibrarian, listMembers);
router.get('/barcode/:barcode', authenticate, isLibrarian, getMemberByBarcode);
router.get('/:id', authenticate, getMember);
router.get('/:id/loans', authenticate, getMemberLoans);
router.get('/:id/fines', authenticate, getMemberFines);
router.get('/:id/reservations', authenticate, getMemberReservations);
router.post('/', authenticate, isLibrarian, createMember);
router.put('/:id', authenticate, updateMember);
router.put('/:id/reset-password', authenticate, isLibrarian, resetMemberPassword);

module.exports = router;
