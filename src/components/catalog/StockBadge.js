import React from 'react';

const StockBadge = ({ quantity, minAlert }) => {
  const qty = parseFloat(quantity) || 0;
  const min = minAlert ? parseFloat(minAlert) : null;
  const isLow = min !== null && qty <= min;
  const isEmpty = qty === 0;

  if (qty === 0 && min === null) return null; // No stock tracking

  const bgClass = isEmpty ? 'bg-gray-100 text-gray-500' : isLow ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${bgClass}`}>
      {qty}
    </span>
  );
};

export default StockBadge;
