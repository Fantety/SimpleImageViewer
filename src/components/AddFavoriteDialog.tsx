import { useState, useEffect } from 'react';
import { addFavorite, getAllTags } from '../api/tauri';
import { TagIcon } from './icons';
import './AddFavoriteDialog.css';

interface AddFavoriteDialogProps {
  isOpen: boolean;
  imagePath: string;
  existingTags?: string[];
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFavoriteDialog({ 
  isOpen, 
  imagePath, 
  existingTags = [],
  onClose, 
  onSuccess 
}: AddFavoriteDialogProps) {
  const [tags, setTags] = useState<string[]>(existingTags);
  const [tagInput, setTagInput] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTags(existingTags);
      loadAllTags();
    }
  }, [isOpen, existingTags]);

  const loadAllTags = async () => {
    try {
      const existingTags = await getAllTags();
      setAllTags(existingTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await addFavorite(imagePath, tags);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add favorite:', error);
      alert('添加收藏失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const fileName = imagePath.split('/').pop() || imagePath;
  const suggestedTags = allTags.filter(tag => !tags.includes(tag));

  return (
    <div className="add-favorite-dialog-overlay" onClick={onClose}>
      <div className="add-favorite-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="add-favorite-dialog-header">
          <h3>添加到收藏夹</h3>
          <button className="add-favorite-dialog-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="add-favorite-dialog-content">
          <div className="add-favorite-file-info">
            <div className="add-favorite-file-name" title={imagePath}>
              {fileName}
            </div>
          </div>

          <div className="add-favorite-tags-section">
            <label className="add-favorite-label">
              <TagIcon size={16} />
              <span>标签</span>
            </label>

            <div className="add-favorite-tag-input-wrapper">
              <input
                type="text"
                className="add-favorite-tag-input"
                placeholder="输入标签并按回车..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>

            {tags.length > 0 && (
              <div className="add-favorite-tags-list">
                {tags.map(tag => (
                  <div key={tag} className="add-favorite-tag">
                    <span>{tag}</span>
                    <button
                      className="add-favorite-tag-remove"
                      onClick={() => removeTag(tag)}
                      aria-label={`移除标签 ${tag}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {suggestedTags.length > 0 && (
              <div className="add-favorite-suggestions">
                <div className="add-favorite-suggestions-label">建议标签：</div>
                <div className="add-favorite-suggestions-list">
                  {suggestedTags.slice(0, 10).map(tag => (
                    <button
                      key={tag}
                      className="add-favorite-suggestion-tag"
                      onClick={() => addTag(tag)}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="add-favorite-dialog-footer">
          <button className="add-favorite-button-cancel" onClick={onClose}>
            取消
          </button>
          <button 
            className="add-favorite-button-save" 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
