import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { booksApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Button, Badge, Spinner, EmptyState, Pagination, BookAvailabilityBadge
} from '../../components/ui';

const BookCard = ({ book }) => (
  <Link to={`/catalog/book/${book.id}`}
    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow flex flex-col gap-2">
    {/* Cover placeholder */}
    <div className="w-full h-40 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center mb-1">
      {book.cover_image_url ? (
        <img src={book.cover_image_url} alt={book.title}
          className="h-full w-full object-cover rounded-lg" />
      ) : (
        <span className="text-4xl">📖</span>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-tight">{book.title}</h3>
      <p className="text-xs text-gray-500 mt-1 truncate">{book.authors || 'Unknown Author'}</p>
      {book.genre && (
        <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full mt-1">
          {book.genre}
        </span>
      )}
    </div>
    <div className="mt-auto pt-1">
      <BookAvailabilityBadge
        availableCopies={book.available_copies}
        totalCopies={book.total_copies}
      />
    </div>
  </Link>
);

const PublicCatalog = () => {
  const { user, isLibrarian } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [genre, setGenre] = useState('');
  const [available, setAvailable] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [page, setPage] = useState(1);

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['public-books', search, genre, available, sortBy, page],
    queryFn: () => booksApi.list({ search, genre, available, sortBy, page, limit: 24 })
      .then(r => r.data),
    keepPreviousData: true,
  });

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => booksApi.genres().then(r => r.data),
    staleTime: Infinity,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleClear = () => {
    setSearch('');
    setSearchInput('');
    setGenre('');
    setAvailable('');
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-blue-900 text-white py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">📚 School Library Catalog</h1>
              <p className="text-blue-200 text-sm mt-1">Discover and borrow books</p>
            </div>
            <div className="flex gap-2">
              {user ? (
                <>
                  {isLibrarian && (
                    <Button variant="secondary" size="sm"
                      onClick={() => navigate('/admin/dashboard')}>
                      Librarian Desk
                    </Button>
                  )}
                  {!isLibrarian && (
                    <Button variant="secondary" size="sm"
                      onClick={() => navigate('/my-loans')}>
                      My Account
                    </Button>
                  )}
                  <Button variant="outline" size="sm"
                    onClick={() => navigate('/login')}>
                    Signed in as {user.firstName}
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate('/login')} size="sm"
                  className="bg-white text-blue-900 hover:bg-blue-50">
                  Sign In
                </Button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title, author, ISBN, or subject..."
              className="flex-1 px-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <Button type="submit" className="px-6" size="lg">Search</Button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 items-center">
          <select
            value={genre}
            onChange={(e) => { setGenre(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Genres</option>
            {genres?.map(g => (
              <option key={g.id} value={g.name}>{g.name} ({g.book_count})</option>
            ))}
          </select>

          <select
            value={available}
            onChange={(e) => { setAvailable(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Books</option>
            <option value="true">Available Now</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="title">Sort: Title</option>
            <option value="year">Sort: Year</option>
            <option value="available">Sort: Availability</option>
            <option value="added">Sort: Recently Added</option>
          </select>

          {(search || genre || available) && (
            <Button variant="ghost" size="sm" onClick={handleClear}>
              Clear Filters
            </Button>
          )}

          {booksData && (
            <span className="text-sm text-gray-500 ml-auto">
              {booksData.pagination.total} book{booksData.pagination.total !== 1 ? 's' : ''} found
            </span>
          )}
        </div>

        {/* Books Grid */}
        {isLoading ? (
          <Spinner size="lg" className="py-20" />
        ) : booksData?.books?.length === 0 ? (
          <EmptyState
            title="No books found"
            description="Try adjusting your search terms or filters"
            action={<Button variant="secondary" onClick={handleClear}>Clear Search</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {booksData?.books?.map(book => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            <Pagination
              page={booksData?.pagination?.page || 1}
              pages={booksData?.pagination?.pages || 1}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default PublicCatalog;
