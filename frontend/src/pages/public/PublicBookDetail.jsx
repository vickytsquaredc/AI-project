import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { booksApi, reservationsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button, Badge, Spinner, BookAvailabilityBadge } from '../../components/ui';
import toast from 'react-hot-toast';

const PublicBookDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: book, isLoading } = useQuery({
    queryKey: ['book', id],
    queryFn: () => booksApi.get(id).then(r => r.data),
  });

  const reserveMutation = useMutation({
    mutationFn: () => reservationsApi.place({ bookId: id }),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Hold placed successfully!');
      qc.invalidateQueries(['book', id]);
    },
    onError: (err) => {
      const msg = err.response?.data?.error || 'Failed to place hold';
      toast.error(msg);
    },
  });

  const handleReserve = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    reserveMutation.mutate();
  };

  if (isLoading) return <Spinner size="lg" className="min-h-screen flex items-center justify-center" />;
  if (!book) return null;

  const authorNames = Array.isArray(book.authors)
    ? book.authors.map(a => a.name).join(', ')
    : book.authors || 'Unknown';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-900 text-white py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <Link to="/catalog" className="text-blue-200 hover:text-white text-sm">
            ← Back to Catalog
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row gap-8">
              {/* Cover */}
              <div className="flex-shrink-0">
                <div className="w-36 h-52 bg-gradient-to-br from-blue-100 to-blue-300 rounded-xl flex items-center justify-center shadow-md">
                  {book.cover_image_url ? (
                    <img src={book.cover_image_url} alt={book.title}
                      className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-6xl">📖</span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{book.title}</h1>
                    {book.subtitle && (
                      <p className="text-gray-500 mt-1">{book.subtitle}</p>
                    )}
                    <p className="text-blue-600 font-medium mt-2">{authorNames}</p>
                  </div>
                  <BookAvailabilityBadge
                    availableCopies={book.available_copies}
                    totalCopies={book.total_copies}
                  />
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
                  {book.publisher && (
                    <div>
                      <span className="text-gray-500">Publisher:</span>
                      <span className="ml-2 text-gray-900">{book.publisher}</span>
                    </div>
                  )}
                  {book.publication_year && (
                    <div>
                      <span className="text-gray-500">Year:</span>
                      <span className="ml-2 text-gray-900">{book.publication_year}</span>
                    </div>
                  )}
                  {book.isbn && (
                    <div>
                      <span className="text-gray-500">ISBN:</span>
                      <span className="ml-2 font-mono text-gray-900">{book.isbn}</span>
                    </div>
                  )}
                  {book.pages && (
                    <div>
                      <span className="text-gray-500">Pages:</span>
                      <span className="ml-2 text-gray-900">{book.pages}</span>
                    </div>
                  )}
                  {book.genre && (
                    <div>
                      <span className="text-gray-500">Genre:</span>
                      <span className="ml-2">
                        <Badge color="blue">{book.genre}</Badge>
                      </span>
                    </div>
                  )}
                  {book.dewey_decimal && (
                    <div>
                      <span className="text-gray-500">Dewey:</span>
                      <span className="ml-2 text-gray-900">{book.dewey_decimal}</span>
                    </div>
                  )}
                  {book.call_number && (
                    <div>
                      <span className="text-gray-500">Call No.:</span>
                      <span className="ml-2 font-mono text-gray-900">{book.call_number}</span>
                    </div>
                  )}
                  {book.language && (
                    <div>
                      <span className="text-gray-500">Language:</span>
                      <span className="ml-2 text-gray-900">{book.language}</span>
                    </div>
                  )}
                </div>

                {/* Tags */}
                {book.subject_tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {book.subject_tags.map(tag => (
                      <span key={tag}
                        className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* CTA */}
                <div className="mt-6 flex gap-3 flex-wrap">
                  {book.available_copies > 0 ? (
                    user ? (
                      <Button size="lg" onClick={() => navigate('/my-loans')}>
                        Available for Checkout
                      </Button>
                    ) : (
                      <Button size="lg" onClick={() => navigate('/login')}>
                        Sign in to Borrow
                      </Button>
                    )
                  ) : (
                    <Button
                      size="lg"
                      variant="warning"
                      onClick={handleReserve}
                      loading={reserveMutation.isPending}
                    >
                      Place Hold
                    </Button>
                  )}
                  {book.reservationQueueLength > 0 && (
                    <p className="text-sm text-gray-500 self-center">
                      {book.reservationQueueLength} person{book.reservationQueueLength > 1 ? 's' : ''} waiting
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {book.description && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
                <p className="text-gray-600 leading-relaxed">{book.description}</p>
              </div>
            )}

            {/* Copies */}
            {book.copies?.length > 0 && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  Copies ({book.copies.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium text-gray-500">Barcode</th>
                        <th className="text-left py-2 font-medium text-gray-500">Status</th>
                        <th className="text-left py-2 font-medium text-gray-500">Condition</th>
                        <th className="text-left py-2 font-medium text-gray-500">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {book.copies.map(copy => (
                        <tr key={copy.id} className="border-b border-gray-100">
                          <td className="py-2 font-mono text-gray-700">{copy.barcode}</td>
                          <td className="py-2">
                            <Badge color={copy.status === 'available' ? 'green' : 'gray'}>
                              {copy.status}
                            </Badge>
                          </td>
                          <td className="py-2 text-gray-600 capitalize">{copy.condition}</td>
                          <td className="py-2 text-gray-600">{copy.location || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicBookDetail;
