const { query, getClient } = require('../config/database');
const { logAudit } = require('../utils/audit');

// GET /api/books - Search and list books
const listBooks = async (req, res, next) => {
  try {
    const {
      search = '',
      genre,
      author,
      available,
      page = 1,
      limit = 20,
      sortBy = 'title',
      sortDir = 'asc'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let whereClause = 'WHERE b.is_active = true';

    if (search) {
      params.push(`%${search}%`);
      const p = params.length;
      whereClause += `
        AND (
          b.title ILIKE $${p}
          OR b.isbn ILIKE $${p}
          OR b.isbn13 ILIKE $${p}
          OR EXISTS (
            SELECT 1 FROM book_authors ba
            JOIN authors a ON a.id = ba.author_id
            WHERE ba.book_id = b.id AND a.name ILIKE $${p}
          )
          OR b.description ILIKE $${p}
          OR b.dewey_decimal ILIKE $${p}
        )`;
    }

    if (genre) {
      params.push(genre);
      whereClause += ` AND g.name ILIKE $${params.length}`;
    }

    if (author) {
      params.push(`%${author}%`);
      whereClause += `
        AND EXISTS (
          SELECT 1 FROM book_authors ba
          JOIN authors a ON a.id = ba.author_id
          WHERE ba.book_id = b.id AND a.name ILIKE $${params.length}
        )`;
    }

    if (available === 'true') {
      whereClause += ' AND b.available_copies > 0';
    }

    const validSortFields = {
      title: 'b.title',
      year: 'b.publication_year',
      available: 'b.available_copies',
      added: 'b.created_at'
    };
    const orderField = validSortFields[sortBy] || 'b.title';
    const orderDir = sortDir === 'desc' ? 'DESC' : 'ASC';

    params.push(parseInt(limit));
    params.push(offset);

    const booksQuery = `
      SELECT
        b.id, b.isbn, b.isbn13, b.title, b.subtitle,
        b.publication_year, b.edition, b.language, b.pages,
        b.description, b.cover_image_url, b.dewey_decimal, b.call_number,
        b.subject_tags, b.total_copies, b.available_copies, b.created_at,
        g.name AS genre,
        pub.name AS publisher,
        STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) AS authors
      FROM books b
      LEFT JOIN genres g ON g.id = b.genre_id
      LEFT JOIN publishers pub ON pub.id = b.publisher_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      ${whereClause}
      GROUP BY b.id, g.name, pub.name
      ORDER BY ${orderField} ${orderDir}
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    // Count query (without pagination params)
    const countParams = params.slice(0, params.length - 2);
    const countQuery = `
      SELECT COUNT(DISTINCT b.id) AS total
      FROM books b
      LEFT JOIN genres g ON g.id = b.genre_id
      LEFT JOIN publishers pub ON pub.id = b.publisher_id
      ${whereClause}
    `;

    const [booksResult, countResult] = await Promise.all([
      query(booksQuery, params),
      query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      books: booksResult.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/:id - Get single book with copies
const getBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bookResult = await query(`
      SELECT
        b.id, b.isbn, b.isbn13, b.title, b.subtitle,
        b.publication_year, b.edition, b.language, b.pages,
        b.description, b.cover_image_url, b.dewey_decimal, b.call_number,
        b.subject_tags, b.total_copies, b.available_copies, b.created_at, b.updated_at,
        g.name AS genre, g.id AS genre_id,
        pub.name AS publisher, pub.id AS publisher_id,
        JSON_AGG(DISTINCT jsonb_build_object(
          'id', a.id, 'name', a.name, 'role', ba.role
        )) FILTER (WHERE a.id IS NOT NULL) AS authors
      FROM books b
      LEFT JOIN genres g ON g.id = b.genre_id
      LEFT JOIN publishers pub ON pub.id = b.publisher_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      WHERE b.id = $1 AND b.is_active = true
      GROUP BY b.id, g.name, g.id, pub.name, pub.id
    `, [id]);

    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Get copies
    const copiesResult = await query(`
      SELECT id, barcode, condition, status, location, notes, acquired_at
      FROM book_copies
      WHERE book_id = $1 AND status != 'withdrawn'
      ORDER BY barcode
    `, [id]);

    // Get active reservations count
    const reserveResult = await query(`
      SELECT COUNT(*) AS queue_length
      FROM reservations
      WHERE book_id = $1 AND status IN ('pending', 'ready')
    `, [id]);

    res.json({
      ...bookResult.rows[0],
      copies: copiesResult.rows,
      reservationQueueLength: parseInt(reserveResult.rows[0].queue_length)
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/books/isbn/:isbn - Look up by ISBN (for barcode scanner)
const getBookByISBN = async (req, res, next) => {
  try {
    const { isbn } = req.params;
    const { rows } = await query(`
      SELECT
        b.id, b.isbn, b.isbn13, b.title,
        b.available_copies, b.total_copies,
        pub.name AS publisher,
        STRING_AGG(DISTINCT a.name, ', ') AS authors
      FROM books b
      LEFT JOIN publishers pub ON pub.id = b.publisher_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      WHERE (b.isbn = $1 OR b.isbn13 = $1) AND b.is_active = true
      GROUP BY b.id, pub.name
    `, [isbn.replace(/-/g, '')]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Book not found with that ISBN' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /api/books/copy/:barcode - Look up copy by barcode
const getCopyByBarcode = async (req, res, next) => {
  try {
    const { barcode } = req.params;
    const { rows } = await query(`
      SELECT
        bc.id AS copy_id, bc.barcode, bc.condition, bc.status, bc.location,
        b.id AS book_id, b.title, b.isbn,
        STRING_AGG(DISTINCT a.name, ', ') AS authors,
        l.id AS loan_id, l.due_date, lu.first_name || ' ' || lu.last_name AS borrower_name,
        lu.id AS borrower_id
      FROM book_copies bc
      JOIN books b ON b.id = bc.book_id
      LEFT JOIN book_authors ba ON ba.book_id = b.id
      LEFT JOIN authors a ON a.id = ba.author_id
      LEFT JOIN loans l ON l.copy_id = bc.id AND l.status IN ('active', 'overdue')
      LEFT JOIN users lu ON lu.id = l.user_id
      WHERE bc.barcode = $1
      GROUP BY bc.id, b.id, l.id, lu.id
    `, [barcode]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Copy not found with that barcode' });
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST /api/books - Add a new book (librarian/admin)
const createBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const {
      isbn, isbn13, title, subtitle, authors = [], publisherName,
      publicationYear, edition, language, pages, description,
      coverImageUrl, deweyDecimal, callNumber, genreName, subjectTags,
      copies = 1, copyLocation
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Upsert publisher
    let publisherId = null;
    if (publisherName) {
      const pubResult = await client.query(
        `INSERT INTO publishers (name) VALUES ($1)
         ON CONFLICT DO NOTHING RETURNING id`,
        [publisherName]
      );
      if (pubResult.rows.length > 0) {
        publisherId = pubResult.rows[0].id;
      } else {
        const existing = await client.query(
          'SELECT id FROM publishers WHERE name = $1', [publisherName]
        );
        publisherId = existing.rows[0]?.id;
      }
    }

    // Upsert genre
    let genreId = null;
    if (genreName) {
      const genreResult = await client.query(
        `INSERT INTO genres (name) VALUES ($1)
         ON CONFLICT (name) DO NOTHING RETURNING id`,
        [genreName]
      );
      if (genreResult.rows.length > 0) {
        genreId = genreResult.rows[0].id;
      } else {
        const existing = await client.query(
          'SELECT id FROM genres WHERE name = $1', [genreName]
        );
        genreId = existing.rows[0]?.id;
      }
    }

    // Insert book
    const bookResult = await client.query(`
      INSERT INTO books (
        isbn, isbn13, title, subtitle, publisher_id, publication_year,
        edition, language, pages, description, cover_image_url,
        dewey_decimal, call_number, genre_id, subject_tags,
        total_copies, available_copies
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$16)
      RETURNING id
    `, [
      isbn || null, isbn13 || null, title, subtitle || null, publisherId,
      publicationYear || null, edition || null, language || 'English',
      pages || null, description || null, coverImageUrl || null,
      deweyDecimal || null, callNumber || null, genreId,
      subjectTags || null, copies
    ]);

    const bookId = bookResult.rows[0].id;

    // Upsert and link authors
    for (const authorName of authors) {
      if (!authorName.trim()) continue;
      const authorResult = await client.query(
        `INSERT INTO authors (name) VALUES ($1)
         ON CONFLICT DO NOTHING RETURNING id`,
        [authorName.trim()]
      );
      let authorId;
      if (authorResult.rows.length > 0) {
        authorId = authorResult.rows[0].id;
      } else {
        const existing = await client.query(
          'SELECT id FROM authors WHERE name = $1', [authorName.trim()]
        );
        authorId = existing.rows[0]?.id;
      }
      if (authorId) {
        await client.query(
          `INSERT INTO book_authors (book_id, author_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [bookId, authorId]
        );
      }
    }

    // Create physical copies
    for (let i = 0; i < copies; i++) {
      const isbnBase = (isbn || isbn13 || bookId.slice(0, 8)).replace(/-/g, '');
      const copyBarcode = `BC${isbnBase.slice(-8)}${String(i + 1).padStart(2, '0')}`;
      await client.query(`
        INSERT INTO book_copies (book_id, barcode, condition, status, location)
        VALUES ($1, $2, 'good', 'available', $3)
        ON CONFLICT (barcode) DO NOTHING
      `, [bookId, copyBarcode, copyLocation || callNumber || null]);
    }

    await client.query('COMMIT');
    await logAudit(req.user.id, 'BOOK_CREATED', 'book', bookId, { title }, req.ip);

    res.status(201).json({ id: bookId, message: 'Book added successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PUT /api/books/:id - Update book (librarian/admin)
const updateBook = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      isbn, isbn13, title, subtitle, authors, publisherName,
      publicationYear, edition, language, pages, description,
      coverImageUrl, deweyDecimal, callNumber, genreName, subjectTags
    } = req.body;

    // Check book exists
    const existing = await client.query('SELECT id FROM books WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Upsert publisher
    let publisherId = null;
    if (publisherName) {
      const pubR = await client.query(
        `INSERT INTO publishers (name) VALUES ($1)
         ON CONFLICT DO NOTHING RETURNING id`,
        [publisherName]
      );
      if (pubR.rows.length > 0) {
        publisherId = pubR.rows[0].id;
      } else {
        const ex = await client.query(
          'SELECT id FROM publishers WHERE name = $1', [publisherName]
        );
        publisherId = ex.rows[0]?.id;
      }
    }

    // Upsert genre
    let genreId = null;
    if (genreName) {
      const gR = await client.query(
        `INSERT INTO genres (name) VALUES ($1)
         ON CONFLICT (name) DO NOTHING RETURNING id`,
        [genreName]
      );
      if (gR.rows.length > 0) {
        genreId = gR.rows[0].id;
      } else {
        const ex = await client.query(
          'SELECT id FROM genres WHERE name = $1', [genreName]
        );
        genreId = ex.rows[0]?.id;
      }
    }

    await client.query(`
      UPDATE books SET
        isbn = COALESCE($1, isbn),
        isbn13 = COALESCE($2, isbn13),
        title = COALESCE($3, title),
        subtitle = $4,
        publisher_id = COALESCE($5, publisher_id),
        publication_year = COALESCE($6, publication_year),
        edition = $7,
        language = COALESCE($8, language),
        pages = COALESCE($9, pages),
        description = $10,
        cover_image_url = $11,
        dewey_decimal = $12,
        call_number = $13,
        genre_id = COALESCE($14, genre_id),
        subject_tags = COALESCE($15, subject_tags)
      WHERE id = $16
    `, [
      isbn || null, isbn13 || null, title || null, subtitle,
      publisherId, publicationYear || null, edition, language || null,
      pages || null, description, coverImageUrl, deweyDecimal, callNumber,
      genreId, subjectTags || null, id
    ]);

    // Update authors if provided
    if (Array.isArray(authors)) {
      await client.query('DELETE FROM book_authors WHERE book_id = $1', [id]);
      for (const authorName of authors) {
        if (!authorName.trim()) continue;
        const aR = await client.query(
          `INSERT INTO authors (name) VALUES ($1)
           ON CONFLICT DO NOTHING RETURNING id`,
          [authorName.trim()]
        );
        let authorId = aR.rows[0]?.id;
        if (!authorId) {
          const ex = await client.query(
            'SELECT id FROM authors WHERE name = $1', [authorName.trim()]
          );
          authorId = ex.rows[0]?.id;
        }
        if (authorId) {
          await client.query(
            `INSERT INTO book_authors (book_id, author_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [id, authorId]
          );
        }
      }
    }

    await client.query('COMMIT');
    await logAudit(req.user.id, 'BOOK_UPDATED', 'book', id, { title }, req.ip);

    res.json({ message: 'Book updated successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// DELETE /api/books/:id - Soft delete (admin)
const deleteBook = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check for active loans
    const loanCheck = await query(
      `SELECT COUNT(*) FROM loans WHERE book_id = $1 AND status IN ('active', 'overdue')`,
      [id]
    );
    if (parseInt(loanCheck.rows[0].count) > 0) {
      return res.status(409).json({
        error: 'Cannot delete book with active loans. Return all copies first.'
      });
    }

    await query('UPDATE books SET is_active = false WHERE id = $1', [id]);
    await logAudit(req.user.id, 'BOOK_DELETED', 'book', id, null, req.ip);

    res.json({ message: 'Book removed from catalog' });
  } catch (err) {
    next(err);
  }
};

// POST /api/books/:id/copies - Add copies to existing book
const addCopy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { barcode, condition = 'good', location, notes } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    const result = await query(`
      INSERT INTO book_copies (book_id, barcode, condition, status, location, notes)
      VALUES ($1, $2, $3, 'available', $4, $5)
      RETURNING id
    `, [id, barcode, condition, location || null, notes || null]);

    res.status(201).json({ id: result.rows[0].id, message: 'Copy added' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/books/copies/:copyId - Update copy status/condition
const updateCopy = async (req, res, next) => {
  try {
    const { copyId } = req.params;
    const { condition, status, location, notes } = req.body;

    await query(`
      UPDATE book_copies SET
        condition = COALESCE($1, condition),
        status = COALESCE($2, status),
        location = COALESCE($3, location),
        notes = $4
      WHERE id = $5
    `, [condition || null, status || null, location || null, notes, copyId]);

    res.json({ message: 'Copy updated' });
  } catch (err) {
    next(err);
  }
};

// GET /api/genres - List all genres
const listGenres = async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT g.id, g.name, g.description, COUNT(b.id) AS book_count
       FROM genres g
       LEFT JOIN books b ON b.genre_id = g.id AND b.is_active = true
       GROUP BY g.id, g.name, g.description
       ORDER BY g.name`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/authors - List all authors
const listAuthors = async (req, res, next) => {
  try {
    const { search } = req.query;
    let q = `SELECT a.id, a.name, COUNT(ba.book_id) AS book_count
             FROM authors a
             LEFT JOIN book_authors ba ON ba.author_id = a.id`;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      q += ` WHERE a.name ILIKE $1`;
    }
    q += ` GROUP BY a.id, a.name ORDER BY a.name LIMIT 50`;
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listBooks, getBook, getBookByISBN, getCopyByBarcode,
  createBook, updateBook, deleteBook,
  addCopy, updateCopy,
  listGenres, listAuthors
};
