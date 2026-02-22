const { pool } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding database...');

    await client.query('BEGIN');

    // ---- Genres ----
    console.log('  Seeding genres...');
    const genreResult = await client.query(`
      INSERT INTO genres (name, description) VALUES
        ('Fiction', 'Literary works created from imagination'),
        ('Non-Fiction', 'Works based on real events and facts'),
        ('Science Fiction', 'Fiction based on imagined future scientific advances'),
        ('Fantasy', 'Fiction involving magic and supernatural elements'),
        ('Mystery', 'Fiction dealing with puzzling crimes'),
        ('Biography', 'Written account of a persons life'),
        ('History', 'Works about past events'),
        ('Science', 'Works about natural sciences'),
        ('Mathematics', 'Works about mathematics'),
        ('Technology', 'Works about technology and computing'),
        ('Literature', 'Classic and contemporary literary works'),
        ('Self-Help', 'Books for personal development'),
        ('Reference', 'Encyclopedias, dictionaries, and reference materials'),
        ('Young Adult', 'Fiction targeted at teenagers'),
        ('Children', 'Books for children')
      ON CONFLICT (name) DO NOTHING
      RETURNING id, name
    `);
    const genres = {};
    genreResult.rows.forEach(r => { genres[r.name] = r.id; });

    // Fetch any existing genres not inserted
    const existingGenres = await client.query('SELECT id, name FROM genres');
    existingGenres.rows.forEach(r => { genres[r.name] = r.id; });

    // ---- Publishers ----
    console.log('  Seeding publishers...');
    const pubResult = await client.query(`
      INSERT INTO publishers (name) VALUES
        ('Penguin Books'),
        ('HarperCollins'),
        ('Random House'),
        ('Scholastic'),
        ('Oxford University Press'),
        ('Cambridge University Press'),
        ('Simon & Schuster'),
        ('Macmillan Publishers'),
        ('Houghton Mifflin'),
        ('National Geographic')
      ON CONFLICT DO NOTHING
      RETURNING id, name
    `);
    const publishers = {};
    pubResult.rows.forEach(r => { publishers[r.name] = r.id; });

    const existingPubs = await client.query('SELECT id, name FROM publishers');
    existingPubs.rows.forEach(r => { publishers[r.name] = r.id; });

    // ---- Authors ----
    console.log('  Seeding authors...');
    const authorData = [
      'J.K. Rowling', 'George Orwell', 'Harper Lee', 'F. Scott Fitzgerald',
      'William Shakespeare', 'Jane Austen', 'Mark Twain', 'Ernest Hemingway',
      'John Steinbeck', 'Roald Dahl', 'C.S. Lewis', 'J.R.R. Tolkien',
      'Stephen Hawking', 'Carl Sagan', 'Richard Feynman', 'Isaac Asimov',
      'Arthur Conan Doyle', 'Agatha Christie', 'Charles Dickens', 'Leo Tolstoy',
      'Maya Angelou', 'Toni Morrison', 'Gabriel García Márquez', 'Fyodor Dostoevsky',
      'Homer', 'Dante Alighieri', 'Miguel de Cervantes', 'Franz Kafka',
      'Virginia Woolf', 'James Joyce'
    ];
    const authorResult = await client.query(
      `INSERT INTO authors (name)
       SELECT unnest($1::text[])
       ON CONFLICT DO NOTHING
       RETURNING id, name`,
      [authorData]
    );
    const authors = {};
    authorResult.rows.forEach(r => { authors[r.name] = r.id; });

    const existingAuthors = await client.query('SELECT id, name FROM authors');
    existingAuthors.rows.forEach(r => { authors[r.name] = r.id; });

    // ---- Books ----
    console.log('  Seeding books...');
    const booksData = [
      {
        isbn: '9780439708180', title: "Harry Potter and the Sorcerer's Stone",
        author: 'J.K. Rowling', publisher: 'Scholastic', year: 1997,
        genre: 'Fantasy', pages: 309, copies: 3,
        dewey: '823.914', call: 'ROW-HAR',
        desc: 'A young boy discovers he is a wizard on his eleventh birthday.',
        tags: ['magic', 'wizards', 'school', 'adventure']
      },
      {
        isbn: '9780451524935', title: '1984',
        author: 'George Orwell', publisher: 'Penguin Books', year: 1949,
        genre: 'Fiction', pages: 328, copies: 2,
        dewey: '823.912', call: 'ORW-198',
        desc: 'A dystopian novel about totalitarian surveillance society.',
        tags: ['dystopia', 'totalitarianism', 'politics', 'surveillance']
      },
      {
        isbn: '9780061743528', title: 'To Kill a Mockingbird',
        author: 'Harper Lee', publisher: 'HarperCollins', year: 1960,
        genre: 'Fiction', pages: 281, copies: 2,
        dewey: '813.54', call: 'LEE-TOK',
        desc: 'A story of racial injustice and childhood in the American South.',
        tags: ['race', 'justice', 'childhood', 'american south']
      },
      {
        isbn: '9780743273565', title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald', publisher: 'Simon & Schuster', year: 1925,
        genre: 'Fiction', pages: 180, copies: 2,
        dewey: '813.52', call: 'FIT-GRE',
        desc: 'The story of the fabulously wealthy Jay Gatsby and his love for Daisy.',
        tags: ['american dream', 'wealth', 'romance', '1920s']
      },
      {
        isbn: '9780743477116', title: 'Romeo and Juliet',
        author: 'William Shakespeare', publisher: 'Simon & Schuster', year: 1597,
        genre: 'Literature', pages: 224, copies: 3,
        dewey: '822.33', call: 'SHA-ROM',
        desc: 'A tragic love story of two young lovers from feuding families.',
        tags: ['romance', 'tragedy', 'classic', 'drama']
      },
      {
        isbn: '9780141439518', title: 'Pride and Prejudice',
        author: 'Jane Austen', publisher: 'Penguin Books', year: 1813,
        genre: 'Fiction', pages: 432, copies: 2,
        dewey: '823.7', call: 'AUS-PRI',
        desc: 'A romantic novel following Elizabeth Bennet and Mr. Darcy.',
        tags: ['romance', 'class', 'marriage', 'england']
      },
      {
        isbn: '9780143039433', title: 'The Adventures of Tom Sawyer',
        author: 'Mark Twain', publisher: 'Penguin Books', year: 1876,
        genre: 'Young Adult', pages: 274, copies: 2,
        dewey: '813.4', call: 'TWA-TOM',
        desc: 'The adventures of a young boy growing up along the Mississippi River.',
        tags: ['adventure', 'childhood', 'mississippi', 'american']
      },
      {
        isbn: '9780684801223', title: 'The Old Man and the Sea',
        author: 'Ernest Hemingway', publisher: 'Simon & Schuster', year: 1952,
        genre: 'Fiction', pages: 127, copies: 2,
        dewey: '813.54', call: 'HEM-OLD',
        desc: 'An aging Cuban fisherman struggles with a giant marlin.',
        tags: ['fishing', 'struggle', 'perseverance', 'cuba']
      },
      {
        isbn: '9780140177398', title: 'Of Mice and Men',
        author: 'John Steinbeck', publisher: 'Penguin Books', year: 1937,
        genre: 'Fiction', pages: 112, copies: 2,
        dewey: '813.52', call: 'STE-MIC',
        desc: 'Two migrant workers in California dream of owning their own farm.',
        tags: ['friendship', 'dreams', 'great depression', 'california']
      },
      {
        isbn: '9780142410370', title: 'Charlie and the Chocolate Factory',
        author: 'Roald Dahl', publisher: 'Penguin Books', year: 1964,
        genre: 'Children', pages: 176, copies: 3,
        dewey: '823.914', call: 'DAH-CHA',
        desc: 'A poor boy wins a golden ticket to tour Willy Wonka chocolate factory.',
        tags: ['chocolate', 'magic', 'children', 'adventure']
      },
      {
        isbn: '9780064409421', title: 'The Lion, the Witch and the Wardrobe',
        author: 'C.S. Lewis', publisher: 'HarperCollins', year: 1950,
        genre: 'Fantasy', pages: 208, copies: 2,
        dewey: '823.912', call: 'LEW-LIO',
        desc: 'Four siblings discover a magical world through a wardrobe.',
        tags: ['narnia', 'magic', 'children', 'fantasy']
      },
      {
        isbn: '9780547928227', title: 'The Hobbit',
        author: 'J.R.R. Tolkien', publisher: 'Houghton Mifflin', year: 1937,
        genre: 'Fantasy', pages: 310, copies: 2,
        dewey: '823.912', call: 'TOL-HOB',
        desc: 'A hobbit goes on an unexpected adventure with dwarves and a wizard.',
        tags: ['middle earth', 'dwarves', 'dragons', 'quest']
      },
      {
        isbn: '9780553380163', title: 'A Brief History of Time',
        author: 'Stephen Hawking', publisher: 'Random House', year: 1988,
        genre: 'Science', pages: 212, copies: 2,
        dewey: '523.1', call: 'HAW-BRI',
        desc: 'An introduction to cosmology for the general reader.',
        tags: ['cosmology', 'universe', 'physics', 'time']
      },
      {
        isbn: '9780345539434', title: 'Cosmos',
        author: 'Carl Sagan', publisher: 'Random House', year: 1980,
        genre: 'Science', pages: 365, copies: 2,
        dewey: '520', call: 'SAG-COS',
        desc: 'A journey through the universe exploring science and human civilization.',
        tags: ['astronomy', 'universe', 'science', 'cosmos']
      },
      {
        isbn: '9780393355628', title: 'The Feynman Lectures on Physics',
        author: 'Richard Feynman', publisher: 'Cambridge University Press', year: 1964,
        genre: 'Science', pages: 1552, copies: 1,
        dewey: '530', call: 'FEY-LEC',
        desc: 'Classic physics lectures by Nobel laureate Richard Feynman.',
        tags: ['physics', 'lectures', 'science', 'university']
      },
      {
        isbn: '9780553293357', title: 'Foundation',
        author: 'Isaac Asimov', publisher: 'Random House', year: 1951,
        genre: 'Science Fiction', pages: 244, copies: 2,
        dewey: '813.54', call: 'ASI-FOU',
        desc: 'A mathematician devises a plan to preserve civilization.',
        tags: ['galactic empire', 'psychohistory', 'sci-fi', 'future']
      },
      {
        isbn: '9780192821676', title: 'The Adventures of Sherlock Holmes',
        author: 'Arthur Conan Doyle', publisher: 'Oxford University Press', year: 1892,
        genre: 'Mystery', pages: 307, copies: 2,
        dewey: '823.8', call: 'DOY-SHE',
        desc: 'Twelve stories of the famous detective Sherlock Holmes.',
        tags: ['detective', 'mystery', 'london', 'victorian']
      },
      {
        isbn: '9780062073501', title: 'Murder on the Orient Express',
        author: 'Agatha Christie', publisher: 'HarperCollins', year: 1934,
        genre: 'Mystery', pages: 274, copies: 2,
        dewey: '823.912', call: 'CHR-MUR',
        desc: 'Hercule Poirot investigates a murder on a luxury train.',
        tags: ['detective', 'train', 'mystery', 'poirot']
      },
      {
        isbn: '9780141439563', title: 'Oliver Twist',
        author: 'Charles Dickens', publisher: 'Penguin Books', year: 1838,
        genre: 'Literature', pages: 608, copies: 2,
        dewey: '823.8', call: 'DIC-OLI',
        desc: 'An orphan boy in Victorian London encounters a gang of criminals.',
        tags: ['orphan', 'victorian', 'social', 'crime']
      },
      {
        isbn: '9780140449136', title: 'War and Peace',
        author: 'Leo Tolstoy', publisher: 'Penguin Books', year: 1869,
        genre: 'Literature', pages: 1296, copies: 1,
        dewey: '891.73', call: 'TOL-WAR',
        desc: 'A sweeping narrative of Russian society during the Napoleonic wars.',
        tags: ['russia', 'war', 'napoleon', 'society']
      },
      {
        isbn: '9780812550702', title: 'I Know Why the Caged Bird Sings',
        author: 'Maya Angelou', publisher: 'Random House', year: 1969,
        genre: 'Biography', pages: 289, copies: 2,
        dewey: '818.54', call: 'ANG-CAG',
        desc: 'Autobiographical account of Maya Angelous childhood.',
        tags: ['autobiography', 'race', 'identity', 'childhood']
      },
      {
        isbn: '9781400033416', title: 'Beloved',
        author: 'Toni Morrison', publisher: 'Random House', year: 1987,
        genre: 'Fiction', pages: 321, copies: 2,
        dewey: '813.54', call: 'MOR-BEL',
        desc: 'A former enslaved woman is haunted by the ghost of her daughter.',
        tags: ['slavery', 'haunting', 'race', 'memory']
      },
      {
        isbn: '9780060883287', title: 'One Hundred Years of Solitude',
        author: 'Gabriel García Márquez', publisher: 'HarperCollins', year: 1967,
        genre: 'Fiction', pages: 417, copies: 2,
        dewey: '863.64', call: 'GAR-ONE',
        desc: 'The multigenerational story of the Buendía family in a fictional town.',
        tags: ['magic realism', 'colombia', 'family', 'latin america']
      },
      {
        isbn: '9780140449242', title: 'Crime and Punishment',
        author: 'Fyodor Dostoevsky', publisher: 'Penguin Books', year: 1866,
        genre: 'Literature', pages: 671, copies: 2,
        dewey: '891.73', call: 'DOS-CRI',
        desc: 'A student commits a murder and grapples with the psychological aftermath.',
        tags: ['psychology', 'crime', 'russia', 'morality']
      },
      {
        isbn: '9780140447941', title: 'The Odyssey',
        author: 'Homer', publisher: 'Penguin Books', year: 1999,
        genre: 'Literature', pages: 541, copies: 2,
        dewey: '883.01', call: 'HOM-ODY',
        desc: 'The epic journey of Odysseus returning home after the Trojan War.',
        tags: ['epic', 'greek', 'mythology', 'journey']
      },
      {
        isbn: '9780192839619', title: 'The Divine Comedy',
        author: 'Dante Alighieri', publisher: 'Oxford University Press', year: 1320,
        genre: 'Literature', pages: 798, copies: 1,
        dewey: '851.1', call: 'DAN-DIV',
        desc: 'An allegorical journey through Hell, Purgatory, and Heaven.',
        tags: ['epic', 'italian', 'medieval', 'allegory']
      },
      {
        isbn: '9780060934347', title: 'Don Quixote',
        author: 'Miguel de Cervantes', publisher: 'HarperCollins', year: 1605,
        genre: 'Literature', pages: 982, copies: 1,
        dewey: '863.3', call: 'CER-DON',
        desc: 'A man reads so many chivalric novels he sets out to be a knight.',
        tags: ['knight', 'spain', 'satire', 'classic']
      },
      {
        isbn: '9780805210576', title: 'The Metamorphosis',
        author: 'Franz Kafka', publisher: 'Macmillan Publishers', year: 1915,
        genre: 'Fiction', pages: 128, copies: 2,
        dewey: '833.912', call: 'KAF-MET',
        desc: 'A man wakes up to find himself transformed into a giant insect.',
        tags: ['absurdism', 'alienation', 'transformation', 'existential']
      },
      {
        isbn: '9780156628709', title: 'To the Lighthouse',
        author: 'Virginia Woolf', publisher: 'Houghton Mifflin', year: 1927,
        genre: 'Fiction', pages: 209, copies: 2,
        dewey: '823.912', call: 'WOO-LIG',
        desc: 'A family holiday interrupted by war and the passage of time.',
        tags: ['modernism', 'stream of consciousness', 'family', 'time']
      },
      {
        isbn: '9780142437247', title: 'Animal Farm',
        author: 'George Orwell', publisher: 'Penguin Books', year: 1945,
        genre: 'Fiction', pages: 140, copies: 3,
        dewey: '823.912', call: 'ORW-ANI',
        desc: 'A farm is taken over by its animals who establish an egalitarian society.',
        tags: ['allegory', 'communism', 'satire', 'politics']
      },
      {
        isbn: '9780439023481', title: 'The Hunger Games',
        author: 'J.K. Rowling', publisher: 'Scholastic', year: 2008,
        genre: 'Young Adult', pages: 374, copies: 3,
        dewey: '813.6', call: 'COL-HUN',
        desc: 'In a dystopian future, children compete in a deadly televised game.',
        tags: ['dystopia', 'survival', 'young adult', 'action']
      },
    ];

    for (const book of booksData) {
      // Insert book
      const bookResult = await client.query(`
        INSERT INTO books (isbn, isbn13, title, publisher_id, publication_year,
          genre_id, pages, description, dewey_decimal, call_number, subject_tags,
          total_copies, available_copies)
        VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        ON CONFLICT (isbn) DO NOTHING
        RETURNING id
      `, [
        book.isbn, book.title,
        publishers[book.publisher],
        book.year,
        genres[book.genre],
        book.pages, book.desc, book.dewey, book.call,
        book.tags,
        book.copies
      ]);

      if (bookResult.rows.length === 0) continue;
      const bookId = bookResult.rows[0].id;

      // Link author
      if (authors[book.author]) {
        await client.query(`
          INSERT INTO book_authors (book_id, author_id) VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `, [bookId, authors[book.author]]);
      }

      // Create physical copies
      for (let i = 0; i < book.copies; i++) {
        const copyBarcode = `BC${book.isbn.slice(-8)}${String(i + 1).padStart(2, '0')}`;
        await client.query(`
          INSERT INTO book_copies (book_id, barcode, condition, status, location)
          VALUES ($1, $2, 'good', 'available', $3)
          ON CONFLICT (barcode) DO NOTHING
        `, [bookId, copyBarcode, book.call]);
      }
    }

    // ---- Users ----
    console.log('  Seeding users...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);
    const libHash = await bcrypt.hash('librarian123', 10);

    await client.query(`
      INSERT INTO users (username, email, password_hash, role, first_name, last_name,
        phone, grade_class, barcode, is_active)
      VALUES
        ('admin', 'admin@school.edu', $1, 'admin', 'System', 'Administrator',
         '555-0001', NULL, 'USR000001', true),
        ('librarian1', 'librarian@school.edu', $2, 'librarian', 'Mary', 'Johnson',
         '555-0002', NULL, 'USR000002', true),
        ('librarian2', 'lib2@school.edu', $2, 'librarian', 'Bob', 'Williams',
         '555-0003', NULL, 'USR000003', true),
        ('teacher1', 'smith@school.edu', $3, 'staff', 'John', 'Smith',
         '555-0010', 'English Dept', 'USR000010', true),
        ('teacher2', 'jones@school.edu', $3, 'staff', 'Sarah', 'Jones',
         '555-0011', 'Science Dept', 'USR000011', true),
        ('student1', 'alice@school.edu', $3, 'student', 'Alice', 'Brown',
         '555-1001', 'Grade 10A', 'USR001001', true),
        ('student2', 'bob.s@school.edu', $3, 'student', 'Bob', 'Davis',
         '555-1002', 'Grade 10A', 'USR001002', true),
        ('student3', 'carol@school.edu', $3, 'student', 'Carol', 'Wilson',
         '555-1003', 'Grade 11B', 'USR001003', true),
        ('student4', 'david@school.edu', $3, 'student', 'David', 'Taylor',
         '555-1004', 'Grade 9C', 'USR001004', true),
        ('student5', 'emma@school.edu', $3, 'student', 'Emma', 'Anderson',
         '555-1005', 'Grade 12A', 'USR001005', true)
      ON CONFLICT (username) DO NOTHING
    `, [adminHash, libHash, passwordHash]);

    console.log('Seed completed successfully!');
    console.log('\nTest Accounts:');
    console.log('  Admin:     admin / admin123');
    console.log('  Librarian: librarian1 / librarian123');
    console.log('  Staff:     teacher1 / password123');
    console.log('  Student:   student1 / password123');

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
