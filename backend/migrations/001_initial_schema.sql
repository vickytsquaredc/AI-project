-- ============================================================
-- School Library Management System - Full Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for fuzzy text search

-- ============================================================
-- USERS / MEMBERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username      VARCHAR(50) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'student'
                  CHECK (role IN ('student', 'staff', 'librarian', 'admin')),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20),
  grade_class   VARCHAR(50),           -- e.g. "Grade 8B" for students
  barcode       VARCHAR(50) UNIQUE,    -- member barcode/card number
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_barcode ON users(barcode);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_name ON users USING gin(
  to_tsvector('english', first_name || ' ' || last_name)
);

-- ============================================================
-- AUTHORS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS authors (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  bio        TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_authors_name ON authors(name);

-- ============================================================
-- PUBLISHERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS publishers (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(255) NOT NULL,
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GENRES / CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS genres (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT
);

-- ============================================================
-- BOOKS TABLE (catalog records - bibliographic)
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  isbn             VARCHAR(20) UNIQUE,
  isbn13           VARCHAR(20) UNIQUE,
  title            VARCHAR(500) NOT NULL,
  subtitle         VARCHAR(500),
  publisher_id     UUID REFERENCES publishers(id) ON DELETE SET NULL,
  publication_year INTEGER CHECK (publication_year BETWEEN 1000 AND 2100),
  edition          VARCHAR(50),
  language         VARCHAR(50) DEFAULT 'English',
  pages            INTEGER CHECK (pages > 0),
  description      TEXT,
  cover_image_url  VARCHAR(500),
  dewey_decimal    VARCHAR(50),        -- Dewey Decimal Classification
  call_number      VARCHAR(100),       -- shelf location code
  genre_id         UUID REFERENCES genres(id) ON DELETE SET NULL,
  subject_tags     TEXT[],             -- array of subject tags
  total_copies     INTEGER NOT NULL DEFAULT 0 CHECK (total_copies >= 0),
  available_copies INTEGER NOT NULL DEFAULT 0 CHECK (available_copies >= 0),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_isbn13 ON books(isbn13);
CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre_id);
CREATE INDEX IF NOT EXISTS idx_books_publisher ON books(publisher_id);
CREATE INDEX IF NOT EXISTS idx_books_available ON books(available_copies);
CREATE INDEX IF NOT EXISTS idx_books_fts ON books USING gin(
  to_tsvector('english',
    coalesce(title, '') || ' ' ||
    coalesce(subtitle, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(isbn, '')
  )
);

-- ============================================================
-- BOOK-AUTHOR JOIN TABLE (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS book_authors (
  book_id    UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  role       VARCHAR(50) DEFAULT 'author', -- author, editor, illustrator, etc.
  sort_order INTEGER DEFAULT 0,
  PRIMARY KEY (book_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_book_authors_author ON book_authors(author_id);

-- ============================================================
-- BOOK COPIES TABLE (physical inventory items)
-- ============================================================
CREATE TABLE IF NOT EXISTS book_copies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  barcode     VARCHAR(50) UNIQUE NOT NULL,  -- physical barcode on book
  condition   VARCHAR(20) NOT NULL DEFAULT 'good'
                CHECK (condition IN ('new', 'good', 'fair', 'poor', 'damaged')),
  status      VARCHAR(20) NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'checked_out', 'reserved',
                                  'lost', 'damaged', 'processing', 'withdrawn')),
  location    VARCHAR(100),   -- shelf/section location
  notes       TEXT,
  acquired_at DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_book_copies_book ON book_copies(book_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_barcode ON book_copies(barcode);
CREATE INDEX IF NOT EXISTS idx_book_copies_status ON book_copies(status);

-- ============================================================
-- LOANS / CHECKOUTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS loans (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  copy_id         UUID NOT NULL REFERENCES book_copies(id) ON DELETE RESTRICT,
  book_id         UUID NOT NULL REFERENCES books(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checked_out_by  UUID REFERENCES users(id) ON DELETE SET NULL, -- librarian who processed
  returned_by     UUID REFERENCES users(id) ON DELETE SET NULL, -- librarian who processed return
  checkout_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date        TIMESTAMPTZ NOT NULL,
  return_date     TIMESTAMPTZ,
  renewal_count   INTEGER NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'returned', 'overdue', 'lost')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_copy ON loans(copy_id);
CREATE INDEX IF NOT EXISTS idx_loans_book ON loans(book_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_loans_checkout_date ON loans(checkout_date);

-- ============================================================
-- RESERVATIONS / HOLDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  book_id        UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  copy_id        UUID REFERENCES book_copies(id) ON DELETE SET NULL, -- assigned when ready
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'ready', 'fulfilled', 'cancelled', 'expired')),
  queue_position INTEGER NOT NULL DEFAULT 1,
  reserved_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at    TIMESTAMPTZ,           -- when patron was notified it's ready
  expires_at     TIMESTAMPTZ,           -- when hold expires (after notification)
  fulfilled_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservations_book ON reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_queue ON reservations(book_id, queue_position);

-- ============================================================
-- FINES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS fines (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id     UUID REFERENCES loans(id) ON DELETE SET NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE SET NULL,
  fine_type   VARCHAR(20) NOT NULL DEFAULT 'overdue'
                CHECK (fine_type IN ('overdue', 'lost', 'damaged')),
  amount      DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  days_overdue INTEGER DEFAULT 0,
  status      VARCHAR(20) NOT NULL DEFAULT 'unpaid'
                CHECK (status IN ('unpaid', 'paid', 'waived')),
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at     TIMESTAMPTZ,
  waived_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  waive_reason TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fines_user ON fines(user_id);
CREATE INDEX IF NOT EXISTS idx_fines_loan ON fines(loan_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         VARCHAR(50) NOT NULL,
  -- Types: due_reminder, overdue_notice, hold_ready, hold_expired,
  --        fine_issued, account_created, renewal_confirmed
  subject      VARCHAR(255) NOT NULL,
  body         TEXT NOT NULL,
  sent_at      TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  is_email     BOOLEAN DEFAULT TRUE,
  status       VARCHAR(20) DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed', 'read')),
  reference_id UUID,    -- loan_id, reservation_id, fine_id, etc.
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================================
-- AUDIT LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id   UUID,
  details     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);

-- ============================================================
-- LIBRARY SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS library_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_books_updated
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_book_copies_updated
  BEFORE UPDATE ON book_copies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_loans_updated
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_reservations_updated
  BEFORE UPDATE ON reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_fines_updated
  BEFORE UPDATE ON fines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Keep books.available_copies in sync with book_copies
CREATE OR REPLACE FUNCTION sync_book_copy_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE books
  SET
    total_copies = (
      SELECT COUNT(*) FROM book_copies
      WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
        AND status != 'withdrawn'
    ),
    available_copies = (
      SELECT COUNT(*) FROM book_copies
      WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
        AND status = 'available'
    )
  WHERE id = COALESCE(NEW.book_id, OLD.book_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_copy_counts
  AFTER INSERT OR UPDATE OR DELETE ON book_copies
  FOR EACH ROW EXECUTE FUNCTION sync_book_copy_counts();

-- Default library settings
INSERT INTO library_settings (key, value, description) VALUES
  ('library_name', 'Springfield School Library', 'Display name of the library'),
  ('fine_rate_per_day', '0.25', 'Fine amount in dollars per overdue day'),
  ('max_books_student', '3', 'Maximum books a student can borrow'),
  ('max_books_staff', '5', 'Maximum books a staff member can borrow'),
  ('loan_period_days', '14', 'Default loan period in days'),
  ('renewal_period_days', '7', 'Extension period per renewal in days'),
  ('max_renewals', '2', 'Maximum number of renewals per loan'),
  ('hold_expiry_days', '3', 'Days patron has to pick up a held book'),
  ('allow_self_renew', 'true', 'Allow patrons to renew their own books online'),
  ('send_due_reminder_days', '2', 'Days before due date to send reminder')
ON CONFLICT (key) DO NOTHING;
