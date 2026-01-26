/**
 * TagSelector Component
 * Reusable component for selecting and creating tags
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Plus, X, Trash2 } from 'lucide-react';
import tagsApi from '../../api/tagsApi';

// Default color palette for new tags
const TAG_COLORS = [
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#3B82F6', // Blue
  '#6B7280', // Gray
];

const TagSelector = ({
  availableTags = [],
  selectedTagIds = [],
  onTagsChange,
  onTagCreated,
  onTagDeleted,
  allowCreate = true,
  allowDelete = true,
  colorScheme = 'green', // 'green', 'blue', 'indigo'
  size = 'md', // 'sm', 'md', 'lg'
  showDescription = true,
  placeholder,
  className = ''
}) => {
  const { t } = useTranslation('catalog');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null); // tagId being deleted
  const [deleteError, setDeleteError] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  // Local state to include newly created tags immediately
  const [localNewTags, setLocalNewTags] = useState([]);
  // Local state to track deleted tags
  const [deletedTagIds, setDeletedTagIds] = useState([]);

  // Combine available tags with locally created ones, excluding deleted ones
  const allTags = [...availableTags, ...localNewTags.filter(
    newTag => !availableTags.some(t => t.id === newTag.id)
  )].filter(tag => !deletedTagIds.includes(tag.id));

  // Color scheme classes
  const colorClasses = {
    green: {
      focus: 'focus:ring-green-500 focus:border-green-500',
      button: 'bg-green-600 hover:bg-green-700',
      selected: 'ring-2 ring-green-500'
    },
    blue: {
      focus: 'focus:ring-blue-500 focus:border-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700',
      selected: 'ring-2 ring-blue-500'
    },
    indigo: {
      focus: 'focus:ring-indigo-500 focus:border-indigo-500',
      button: 'bg-indigo-600 hover:bg-indigo-700',
      selected: 'ring-2 ring-indigo-500'
    }
  };

  const colors = colorClasses[colorScheme] || colorClasses.green;

  // Size classes
  const sizeClasses = {
    sm: {
      tag: 'px-2 py-0.5 text-xs',
      input: 'px-2 py-1 text-sm',
      dot: 'w-1.5 h-1.5'
    },
    md: {
      tag: 'px-3 py-1 text-sm',
      input: 'px-3 py-1.5 text-sm',
      dot: 'w-2 h-2'
    },
    lg: {
      tag: 'px-4 py-1.5 text-base',
      input: 'px-4 py-2 text-base',
      dot: 'w-2.5 h-2.5'
    }
  };

  const sizes = sizeClasses[size] || sizeClasses.md;

  // Toggle tag selection
  const toggleTag = (tagId) => {
    const newSelection = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter(id => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagsChange(newSelection);
  };

  // Create new tag
  const handleCreateTag = async () => {
    if (!newTagName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const response = await tagsApi.createTag({
        name: newTagName.trim(),
        color: newTagColor
      });

      if (response.success && response.data) {
        const newTag = response.data;
        // Add to local state immediately for instant UI update
        setLocalNewTags(prev => [...prev, newTag]);
        // Auto-select the new tag
        onTagsChange([...selectedTagIds, newTag.id]);
        // Notify parent to refresh tags list
        if (onTagCreated) {
          onTagCreated(newTag);
        }
        setNewTagName('');
        setShowColorPicker(false);
      }
    } catch (error) {
      console.error('Error creating tag:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // Delete a tag
  const handleDeleteTag = async (tagId, e) => {
    e.stopPropagation(); // Prevent toggle selection
    if (isDeleting) return;

    setIsDeleting(tagId);
    setDeleteError(null);

    try {
      const response = await tagsApi.deleteTag(tagId);

      if (response.success) {
        // Remove from local state immediately
        setDeletedTagIds(prev => [...prev, tagId]);
        // Remove from selection if selected
        if (selectedTagIds.includes(tagId)) {
          onTagsChange(selectedTagIds.filter(id => id !== tagId));
        }
        // Notify parent
        if (onTagDeleted) {
          onTagDeleted(tagId);
        }
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      // Check if it's a "has products" error
      if (error.data?.error?.code === 'TAG_HAS_PRODUCTS') {
        setDeleteError({
          tagId,
          message: t('tags.deleteHasProducts', 'Ce tag est associé à des produits')
        });
        // Clear error after 3 seconds
        setTimeout(() => setDeleteError(null), 3000);
      }
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle Enter key in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <div className={className}>
      {/* Label */}
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <span className="flex items-center gap-2">
          <Tag className="h-4 w-4" />
          {t('fields.tags', 'Tags')}
        </span>
      </label>

      {/* Description */}
      {showDescription && (
        <p className="text-xs text-gray-500 mb-3">
          {t('tags.description', 'Use tags to group and organize your products')}
        </p>
      )}

      {/* Delete error message */}
      {deleteError && (
        <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {deleteError.message}
        </div>
      )}

      {/* Available tags */}
      <div className="flex flex-wrap gap-2 mb-3">
        {allTags.map(tag => {
          const isSelected = selectedTagIds.includes(tag.id);
          const isBeingDeleted = isDeleting === tag.id;
          return (
            <div key={tag.id} className="group relative inline-flex">
              <button
                type="button"
                onClick={() => toggleTag(tag.id)}
                disabled={isBeingDeleted}
                className={`inline-flex items-center gap-1.5 ${sizes.tag} rounded-full transition-all ${
                  isSelected
                    ? 'text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } ${isBeingDeleted ? 'opacity-50' : ''}`}
                style={isSelected ? { backgroundColor: tag.color } : {}}
                title={tag.description || tag.name}
              >
                <span
                  className={`${sizes.dot} rounded-full flex-shrink-0`}
                  style={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.8)' : tag.color }}
                />
                {tag.name}
                {isSelected && (
                  <X className="h-3 w-3 ml-0.5 opacity-70" />
                )}
              </button>
              {/* Delete button - visible on hover when not selected */}
              {allowDelete && !isSelected && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteTag(tag.id, e)}
                  disabled={isBeingDeleted}
                  className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                  title={t('tags.delete', 'Supprimer le tag')}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        {allTags.length === 0 && (
          <span className="text-sm text-gray-400 italic">
            {t('tags.noTags', 'No tags available')}
          </span>
        )}
      </div>

      {/* Create new tag */}
      {allowCreate && (
        <div className="flex items-center gap-2">
          {/* Color picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-8 h-8 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
              style={{ backgroundColor: newTagColor }}
              title={t('tags.selectColor', 'Select color')}
            />
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-lg border border-gray-200 z-10 grid grid-cols-5 gap-1">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setNewTagColor(color);
                      setShowColorPicker(false);
                    }}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${
                      newTagColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Tag name input */}
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder || t('tags.newTagPlaceholder', 'New tag...')}
            className={`flex-1 ${sizes.input} border border-gray-300 rounded-lg ${colors.focus}`}
          />

          {/* Create button */}
          <button
            type="button"
            onClick={handleCreateTag}
            disabled={!newTagName.trim() || isCreating}
            className={`inline-flex items-center gap-1 ${sizes.input} ${colors.button} text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
          >
            <Plus className="h-4 w-4" />
            {t('tags.create', 'Create')}
          </button>
        </div>
      )}

      {/* Selected count */}
      {selectedTagIds.length > 0 && (
        <p className="text-xs text-gray-500 mt-2">
          {t('tags.selected', { count: selectedTagIds.length })}
        </p>
      )}
    </div>
  );
};

export default TagSelector;
