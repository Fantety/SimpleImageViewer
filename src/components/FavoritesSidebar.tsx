import { useState, useEffect } from 'react';
import { FavoriteImage, getAllFavorites, getAllTags, searchFavoritesByTags, fileExists, removeFavorite } from '../api/tauri';
import { FavoriteIcon, TagIcon, SearchIcon } from './icons';
import './FavoritesSidebar.css';

interface FavoritesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (path: string) => void;
  currentImagePath?: string;
}

export function FavoritesSidebar({ isOpen, onClose, onSelectImage, currentImagePath }: FavoritesSidebarProps) {
  const [favorites, setFavorites] = useState<FavoriteImage[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [missingFiles, setMissingFiles] = useState<Set<string>>(new Set());

  // Load favorites and tags
  const loadFavorites = async () => {
    try {
      setLoading(true);
      
      // First, get all tags if we don't have them yet
      let tags = allTags;
      if (tags.length === 0) {
        tags = await getAllTags();
        setAllTags(tags);
      }
      
      // Determine which tags to search for
      let tagsToSearch = [...selectedTags];
      
      // If there's a search query, also search by it as a tag
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        // Check if the query matches any existing tag (case-insensitive)
        const matchingTags = tags.filter(tag => 
          tag.toLowerCase().includes(query)
        );
        
        // If we found matching tags, add them to the search
        if (matchingTags.length > 0) {
          tagsToSearch = [...new Set([...tagsToSearch, ...matchingTags])];
        }
      }
      
      // Load favorites based on tag search
      const favs = tagsToSearch.length > 0 
        ? await searchFavoritesByTags(tagsToSearch)
        : await getAllFavorites();
      
      setFavorites(favs);
      
      // Check which files exist
      const missing = new Set<string>();
      await Promise.all(
        favs.map(async (fav) => {
          const exists = await fileExists(fav.path);
          if (!exists) {
            missing.add(fav.path);
          }
        })
      );
      setMissingFiles(missing);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFavorites();
    }
  }, [isOpen, selectedTags]);

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      loadFavorites();
    }, 300); // Wait 300ms after user stops typing
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter favorites by search query (for file names)
  const filteredFavorites = favorites.filter(fav => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fileName = fav.path.split('/').pop()?.toLowerCase() || '';
    const matchesTags = fav.tags.some(tag => tag.toLowerCase().includes(query));
    return fileName.includes(query) || matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  const handleRemoveMissing = async (path: string) => {
    try {
      await removeFavorite(path);
      // Reload favorites
      await loadFavorites();
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const handleSelectImage = (path: string) => {
    // Check if file is missing
    if (missingFiles.has(path)) {
      const confirmRemove = window.confirm(
        '该图片文件不存在，是否从收藏夹中移除？'
      );
      if (confirmRemove) {
        handleRemoveMissing(path);
      }
      return;
    }
    
    onSelectImage(path);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="favorites-sidebar-overlay" onClick={onClose} />
      <div className="favorites-sidebar">
        <div className="favorites-sidebar-header">
          <div className="favorites-sidebar-title">
            <FavoriteIcon size={20} filled />
            <span>收藏夹</span>
          </div>
          <button className="favorites-sidebar-close" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {/* Search */}
        <div className="favorites-search">
          <SearchIcon size={18} />
          <input
            type="text"
            placeholder="搜索文件名或标签..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Tags Filter */}
        {allTags.length > 0 && (
          <div className="favorites-tags-section">
            <div className="favorites-tags-header">
              <TagIcon size={16} />
              <span>标签筛选</span>
              {selectedTags.length > 0 && (
                <button className="favorites-clear-filters" onClick={clearFilters}>
                  清除
                </button>
              )}
            </div>
            <div className="favorites-tags-list">
              {allTags.map(tag => (
                <button
                  key={tag}
                  className={`favorites-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Favorites List */}
        <div className="favorites-list">
          {loading ? (
            <div className="favorites-loading">加载中...</div>
          ) : filteredFavorites.length === 0 ? (
            <div className="favorites-empty">
              {favorites.length === 0 ? (
                <>
                  <FavoriteIcon size={48} />
                  <p>还没有收藏的图片</p>
                  <p className="favorites-empty-hint">点击工具栏的收藏按钮添加图片</p>
                </>
              ) : (
                <>
                  <SearchIcon size={48} />
                  <p>没有找到匹配的图片</p>
                </>
              )}
            </div>
          ) : (
            filteredFavorites.map(fav => {
              const fileName = fav.path.split('/').pop() || fav.path;
              const isActive = fav.path === currentImagePath;
              const isMissing = missingFiles.has(fav.path);
              
              return (
                <div
                  key={fav.path}
                  className={`favorites-item ${isActive ? 'active' : ''} ${isMissing ? 'missing' : ''}`}
                  onClick={() => handleSelectImage(fav.path)}
                >
                  <div className="favorites-item-info">
                    <div className="favorites-item-name" title={fav.path}>
                      {isMissing && <span className="favorites-item-warning">⚠️ </span>}
                      {fileName}
                    </div>
                    {fav.tags.length > 0 && (
                      <div className="favorites-item-tags">
                        {fav.tags.map(tag => (
                          <span key={tag} className="favorites-item-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {isMissing && (
                    <button
                      className="favorites-item-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMissing(fav.path);
                      }}
                      title="从收藏夹中移除"
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
