import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { booksApi } from '../../services/api';
import {
  Button, Badge, Card, Modal, Input, Select, Textarea,
  Spinner, EmptyState, Pagination, BookAvailabilityBadge
} from '../../components/ui';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';

const BookForm = ({ book, onSuccess }) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: book ? {
      title: book.title,
      subtitle: book.subtitle || '',
      isbn: book.isbn || '',
      authors: Array.isArray(book.authors)
        ? book.authors.map(a => a.name).join(', ')
        : book.authors || '',
      publisherName: book.publisher || '',
      publicationYear: book.publication_year || '',
      pages: book.pages || '',
      genreName: book.genre || '',
      deweyDecimal: book.dewey_decimal || '',
      callNumber: book.call_number || '',
      language: book.language || 'English',
      description: book.description || '',
      coverImageUrl: book.cover_image_url || '',
      copies: 1,
    } : { language: 'English', copies: 1 }
  });

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => booksApi.genres().then(r => r.data),
  });

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        authors: data.authors.split(',').map(s => s.trim()).filter(Boolean),
        publicationYear: data.publicationYear ? parseInt(data.publicationYear) : null,
        pages: data.pages ? parseInt(data.pages) : null,
        copies: data.copies ? parseInt(data.copies) : 1,
      };
      return book ? booksApi.update(book.id, payload) : booksApi.create(payload);
    },
    onSuccess: () => {
      toast.success(book ? 'Book updated!' : 'Book added to catalog!');
      qc.invalidateQueries(['admin-books']);
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Operation failed');
    }
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Input label="Title *" {...register('title', { required: 'Title is required' })}
            error={errors.title?.message} />
        </div>
        <Input label="Subtitle" {...register('subtitle')} />
        <Input label="ISBN" {...register('isbn')} placeholder="e.g. 9780439708180" />
        <div className="sm:col-span-2">
          <Input label="Authors (comma-separated)" {...register('authors')}
            placeholder="e.g. J.K. Rowling, John Smith" />
        </div>
        <Input label="Publisher" {...register('publisherName')} />
        <Input label="Publication Year" type="number" {...register('publicationYear')}
          placeholder="e.g. 2023" />
        <Input label="Pages" type="number" {...register('pages')} />
        <Select label="Genre" {...register('genreName')}>
          <option value="">Select genre</option>
          {genres?.map(g => (
            <option key={g.id} value={g.name}>{g.name}</option>
          ))}
          <option value="__new">+ Add new genre</option>
        </Select>
        <Input label="Dewey Decimal" {...register('deweyDecimal')} placeholder="e.g. 823.914" />
        <Input label="Call Number" {...register('callNumber')} placeholder="e.g. ROW-HAR" />
        <Input label="Language" {...register('language')} />
        <Input label="Cover Image URL" {...register('coverImageUrl')} />
        {!book && (
          <Input label="Number of Copies" type="number" {...register('copies')}
            helpText="How many physical copies to add" />
        )}
        <div className="sm:col-span-2">
          <Textarea label="Description" {...register('description')} rows={4} />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" loading={mutation.isPending}>
          {book ? 'Update Book' : 'Add Book'}
        </Button>
      </div>
    </form>
  );
};

const BooksAdmin = () => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [genre, setGenre] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editBook, setEditBook] = useState(null);
  const [isbnScanMode, setIsbnScanMode] = useState(false);
  const [isbnInput, setIsbnInput] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-books', search, genre, page],
    queryFn: () => booksApi.list({ search, genre, page, limit: 15 }).then(r => r.data),
  });

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => booksApi.genres().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => booksApi.delete(id),
    onSuccess: () => {
      toast.success('Book removed from catalog');
      qc.invalidateQueries(['admin-books']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  const handleISBNScan = async (e) => {
    e.preventDefault();
    if (!isbnInput) return;
    try {
      const { data: foundBook } = await booksApi.getByISBN(isbnInput);
      toast.success(`Found: ${foundBook.title}`);
      setSearch(isbnInput);
      setSearchInput(isbnInput);
      setIsbnScanMode(false);
      setIsbnInput('');
    } catch {
      toast.error('No book found with that ISBN');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book Catalog</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the library's book collection</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsbnScanMode(true)}>
            ISBN Scan
          </Button>
          <Button onClick={() => { setEditBook(null); setShowForm(true); }}>
            + Add Book
          </Button>
        </div>
      </div>

      {/* Search/Filter Bar */}
      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <form onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); setPage(1); }}
            className="flex gap-2 flex-1 min-w-48">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search title, author, ISBN..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
            <Button type="submit" size="sm">Search</Button>
          </form>
          <select value={genre}
            onChange={(e) => { setGenre(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
            <option value="">All Genres</option>
            {genres?.map(g => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>
          {(search || genre) && (
            <Button variant="ghost" size="sm"
              onClick={() => { setSearch(''); setSearchInput(''); setGenre(''); setPage(1); }}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Books Table */}
      <Card padding={false}>
        {isLoading ? (
          <Spinner size="md" className="py-10" />
        ) : data?.books?.length === 0 ? (
          <EmptyState title="No books found"
            description="Add your first book or adjust the search"
            action={<Button onClick={() => setShowForm(true)}>Add Book</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title / Author</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">ISBN</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Genre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Call No.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Availability</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.books.map(book => (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/catalog/book/${book.id}`} target="_blank"
                        className="font-medium text-blue-700 hover:underline block">
                        {book.title}
                      </Link>
                      <span className="text-gray-400 text-xs">{book.authors || 'Unknown'}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                      {book.isbn || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {book.genre && <Badge color="blue">{book.genre}</Badge>}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-xs">
                      {book.call_number || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <BookAvailabilityBadge
                        availableCopies={book.available_copies}
                        totalCopies={book.total_copies}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm"
                          onClick={() => { setEditBook(book); setShowForm(true); }}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm"
                          onClick={() => {
                            if (window.confirm('Remove this book from the catalog?')) {
                              deleteMutation.mutate(book.id);
                            }
                          }}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Pagination
        page={data?.pagination?.page || 1}
        pages={data?.pagination?.pages || 1}
        onPageChange={setPage}
      />

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditBook(null); }}
        title={editBook ? 'Edit Book' : 'Add New Book'}
        size="lg"
      >
        <BookForm
          book={editBook}
          onSuccess={() => { setShowForm(false); setEditBook(null); }}
        />
      </Modal>

      {/* ISBN Scan Modal */}
      <Modal
        isOpen={isbnScanMode}
        onClose={() => setIsbnScanMode(false)}
        title="ISBN Scanner"
        size="sm"
      >
        <p className="text-gray-500 text-sm mb-4">
          Scan or type an ISBN barcode to look up a book.
        </p>
        <form onSubmit={handleISBNScan} className="flex gap-2">
          <input
            type="text"
            value={isbnInput}
            onChange={(e) => setIsbnInput(e.target.value)}
            placeholder="ISBN barcode..."
            autoFocus
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
          <Button type="submit">Look Up</Button>
        </form>
      </Modal>
    </div>
  );
};

export default BooksAdmin;
