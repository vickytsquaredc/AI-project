const express = require('express');
const router = express.Router();
const {
  listReservations, placeReservation, cancelReservation, getBookQueue
} = require('../controllers/reservationsController');
const { authenticate, isLibrarian } = require('../middleware/auth');

router.get('/', authenticate, isLibrarian, listReservations);
router.get('/book/:bookId', authenticate, isLibrarian, getBookQueue);
router.post('/', authenticate, placeReservation);
router.delete('/:id', authenticate, cancelReservation);

module.exports = router;
