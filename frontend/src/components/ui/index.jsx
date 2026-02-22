import React from 'react';

// ---- Button ----
export const Button = ({
  children, variant = 'primary', size = 'md',
  className = '', disabled, loading, type = 'button', onClick, ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed gap-2';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-400',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10"
            stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
};

// ---- Input ----
export const Input = React.forwardRef(({
  label, error, className = '', helpText, ...props
}, ref) => (
  <div>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    )}
    <input
      ref={ref}
      className={`block w-full px-3 py-2 border rounded-lg text-sm shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        ${error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'}
        ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    {helpText && !error && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
  </div>
));

// ---- Select ----
export const Select = React.forwardRef(({
  label, error, className = '', children, ...props
}, ref) => (
  <div>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    )}
    <select
      ref={ref}
      className={`block w-full px-3 py-2 border rounded-lg text-sm shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        ${error ? 'border-red-400' : 'border-gray-300'} bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
));

// ---- Textarea ----
export const Textarea = React.forwardRef(({
  label, error, className = '', rows = 3, ...props
}, ref) => (
  <div>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    )}
    <textarea
      ref={ref}
      rows={rows}
      className={`block w-full px-3 py-2 border rounded-lg text-sm shadow-sm
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
        ${error ? 'border-red-400' : 'border-gray-300'} ${className}`}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
  </div>
));

// ---- Card ----
export const Card = ({ children, className = '', padding = true }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm
    ${padding ? 'p-5' : ''} ${className}`}>
    {children}
  </div>
);

// ---- Badge ----
export const Badge = ({ children, color = 'gray', className = '' }) => {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    orange: 'bg-orange-100 text-orange-700',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
      font-medium ${colors[color]} ${className}`}>
      {children}
    </span>
  );
};

// ---- Modal ----
export const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className={`relative bg-white rounded-xl shadow-xl w-full ${sizes[size]} max-h-[90vh] overflow-y-auto`}>
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ---- Spinner ----
export const Spinner = ({ size = 'md', className = '' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg className={`animate-spin ${sizes[size]} text-blue-600`}
        fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
};

// ---- StatCard ----
export const StatCard = ({ label, value, sub, color = 'blue', icon }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <Card className="flex items-start gap-4">
      {icon && (
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
};

// ---- Empty State ----
export const EmptyState = ({ title, description, action }) => (
  <div className="text-center py-12">
    <div className="text-5xl mb-4">📚</div>
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    {description && <p className="text-gray-500 mt-1 text-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ---- Pagination ----
export const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline" size="sm"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-600">
        Page {page} of {pages}
      </span>
      <Button
        variant="outline" size="sm"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
};

// ---- LoanStatusBadge ----
export const LoanStatusBadge = ({ status }) => {
  const config = {
    active: { color: 'blue', label: 'Active' },
    returned: { color: 'green', label: 'Returned' },
    overdue: { color: 'red', label: 'Overdue' },
    lost: { color: 'gray', label: 'Lost' },
  };
  const { color, label } = config[status] || { color: 'gray', label: status };
  return <Badge color={color}>{label}</Badge>;
};

// ---- BookAvailabilityBadge ----
export const BookAvailabilityBadge = ({ availableCopies, totalCopies }) => {
  if (availableCopies > 0) {
    return <Badge color="green">{availableCopies} of {totalCopies} available</Badge>;
  }
  return <Badge color="red">All {totalCopies} copies checked out</Badge>;
};
