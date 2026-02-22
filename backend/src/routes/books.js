const express = require('express');
const router = express.Router();
const {
  listBooks, getBook, getBookByISBN, getCopyByBarcode,
  createBook, updateBook, deleteBook,
  addCopy, updateCopy,
  listGenres, listAuthors
} = require('../controllers/booksController');
const { authenticate, optionalAuth, isLibrarian, isAdmin } = require('../middleware/auth');

// Public catalog endpoints (OPAC)
router.get('/', optionalAuth, listBooks);
router.get('/genres', listGenres);
router.get('/authors', listAuthors);
router.get('/isbn/:isbn', optionalAuth, getBookByISBN);
router.get('/copy/barcode/:barcode', authenticate, isLibrarian, getCopyByBarcode);
router.get('/:id', optionalAuth, getBook);

// Librarian/Admin endpoints
router.post('/', authenticate, isLibrarian, createBook);
router.put('/:id', authenticate, isLibrarian, updateBook);
router.delete('/:id', authenticate, isAdmin, deleteBook);
router.post('/:id/copies', authenticate, isLibrarian, addCopy);
router.put('/copies/:copyId', authenticate, isLibrarian, updateCopy);

module.exports = router;
