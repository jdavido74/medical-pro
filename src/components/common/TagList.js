/**
 * TagList Component
 * Displays tags with their associated products and attributes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tag, ChevronDown, ChevronRight, Pill, Syringe, Stethoscope,
  Package, Clock, Edit, Trash2, MoreVertical
} from 'lucide-react';
import tagsApi from '../../api/tagsApi';

// Icon mapping for item types
const TYPE_ICONS = {
  medication: Pill,
  treatment: Syringe,
  service: Stethoscope,
  product: Package
};

// Color mapping for item types
const TYPE_COLORS = {
  medication: 'text-green-600 bg-green-50',
  treatment: 'text-blue-600 bg-blue-50',
  service: 'text-purple-600 bg-purple-50',
  product: 'text-gray-600 bg-gray-50'
};

const TagList = ({
  tags = [],
  onTagEdit,
  onTagDelete,
  onProductClick,
  loading = false,
  showProducts = true,
  showProductCount = true,
  expandable = true,
  className = ''
}) => {
  const { t } = useTranslation('catalog');
  const [expandedTags, setExpandedTags] = useState(new Set());
  const [tagProducts, setTagProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState({});
  const [actionMenuOpen, setActionMenuOpen] = useState(null);

  // Toggle tag expansion
  const toggleTag = useCallback(async (tagId) => {
    const newExpanded = new Set(expandedTags);

    if (newExpanded.has(tagId)) {
      newExpanded.delete(tagId);
    } else {
      newExpanded.add(tagId);

      // Load products if not already loaded
      if (!tagProducts[tagId] && showProducts) {
        setLoadingProducts(prev => ({ ...prev, [tagId]: true }));
        try {
          const response = await tagsApi.getTag(tagId);
          if (response.success && response.data) {
            setTagProducts(prev => ({
              ...prev,
              [tagId]: response.data.products || []
            }));
          }
        } catch (error) {
          console.error('Error loading tag products:', error);
        } finally {
          setLoadingProducts(prev => ({ ...prev, [tagId]: false }));
        }
      }
    }

    setExpandedTags(newExpanded);
  }, [expandedTags, tagProducts, showProducts]);

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price || 0);
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`;
  };

  // Close action menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setActionMenuOpen(null);
    if (actionMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [actionMenuOpen]);

  if (loading) {
    return (
      <div className={`animate-pulse space-y-3 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Tag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">{t('tags.noTags', 'No tags available')}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {tags.map(tag => {
        const isExpanded = expandedTags.has(tag.id);
        const products = tagProducts[tag.id] || [];
        const isLoadingProducts = loadingProducts[tag.id];
        const productCount = tag.productCount ?? products.length;

        return (
          <div
            key={tag.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Tag header */}
            <div
              className={`flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors ${
                expandable && showProducts ? 'cursor-pointer' : ''
              }`}
              onClick={() => expandable && showProducts && toggleTag(tag.id)}
            >
              <div className="flex items-center gap-3">
                {/* Expand icon */}
                {expandable && showProducts && (
                  <span className="text-gray-400">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </span>
                )}

                {/* Tag color dot */}
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tag.color }}
                />

                {/* Tag name */}
                <span className="font-medium text-gray-900">{tag.name}</span>

                {/* Product count badge */}
                {showProductCount && (
                  <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                    {productCount} {productCount === 1 ? t('tags.product', 'product') : t('tags.products', 'products')}
                  </span>
                )}
              </div>

              {/* Actions */}
              {(onTagEdit || onTagDelete) && (
                <div className="relative" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setActionMenuOpen(actionMenuOpen === tag.id ? null : tag.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {actionMenuOpen === tag.id && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      {onTagEdit && (
                        <button
                          onClick={() => {
                            onTagEdit(tag);
                            setActionMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="h-4 w-4" />
                          {t('actions.edit', 'Edit')}
                        </button>
                      )}
                      {onTagDelete && (
                        <button
                          onClick={() => {
                            onTagDelete(tag);
                            setActionMenuOpen(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          {t('actions.delete', 'Delete')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tag description */}
            {tag.description && isExpanded && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <p className="text-sm text-gray-600">{tag.description}</p>
              </div>
            )}

            {/* Products list */}
            {isExpanded && showProducts && (
              <div className="border-t border-gray-100">
                {isLoadingProducts ? (
                  <div className="px-4 py-6 text-center">
                    <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="px-4 py-4 text-center text-sm text-gray-400">
                    {t('tags.noProducts', 'No products with this tag')}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {products.map(product => {
                      const itemType = product.itemType || product.item_type || product.type;
                      const TypeIcon = TYPE_ICONS[itemType] || Package;
                      const typeColor = TYPE_COLORS[itemType] || TYPE_COLORS.product;

                      return (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 ${
                            onProductClick ? 'cursor-pointer' : ''
                          }`}
                          onClick={() => onProductClick && onProductClick(product)}
                        >
                          <div className="flex items-center gap-3">
                            {/* Type icon */}
                            <span className={`p-1.5 rounded ${typeColor}`}>
                              <TypeIcon className="h-4 w-4" />
                            </span>

                            {/* Product info */}
                            <div>
                              <span className="font-medium text-gray-900">
                                {product.title || product.name}
                              </span>
                              {product.description && (
                                <p className="text-xs text-gray-500 truncate max-w-xs">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Attributes */}
                          <div className="flex items-center gap-4 text-sm">
                            {/* Duration */}
                            {product.duration && (
                              <span className="flex items-center gap-1 text-gray-500">
                                <Clock className="h-3.5 w-3.5" />
                                {formatDuration(product.duration)}
                              </span>
                            )}

                            {/* Dosage */}
                            {product.dosage && (
                              <span className="text-gray-500">
                                {product.dosage} {product.dosage_unit || product.dosageUnit || 'mg'}
                              </span>
                            )}

                            {/* Price */}
                            <span className="flex items-center gap-1 font-medium text-gray-900">
                              {formatPrice(product.unit_price || product.unitPrice || product.price)}
                            </span>

                            {/* Status indicator */}
                            {product.is_active === false && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                                {t('status.inactive', 'Inactive')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TagList;
