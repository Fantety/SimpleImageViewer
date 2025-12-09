use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use crate::error::{AppError, AppResult};

/// Favorite image entry with tags
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FavoriteImage {
    pub path: String,
    pub tags: Vec<String>,
    pub added_at: i64, // Unix timestamp
}

/// Favorites configuration
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FavoritesConfig {
    pub favorites: HashMap<String, FavoriteImage>,
}

impl FavoritesConfig {
    /// Get the path to the favorites config file
    fn get_config_path() -> AppResult<PathBuf> {
        let config_dir = dirs::config_dir()
            .ok_or_else(|| AppError::InvalidParameters("Cannot determine config directory".to_string()))?;
        
        let app_config_dir = config_dir.join("simpleimageviewer");
        
        // Create directory if it doesn't exist
        if !app_config_dir.exists() {
            fs::create_dir_all(&app_config_dir)
                .map_err(AppError::IoError)?;
        }
        
        Ok(app_config_dir.join("favorites.json"))
    }
    
    /// Load favorites from config file
    pub fn load() -> AppResult<Self> {
        let config_path = Self::get_config_path()?;
        
        if !config_path.exists() {
            return Ok(Self::default());
        }
        
        let content = fs::read_to_string(&config_path)
            .map_err(AppError::IoError)?;
        
        let config: FavoritesConfig = serde_json::from_str(&content)
            .map_err(|e| AppError::InvalidParameters(format!("Failed to parse favorites config: {}", e)))?;
        
        Ok(config)
    }
    
    /// Save favorites to config file
    pub fn save(&self) -> AppResult<()> {
        let config_path = Self::get_config_path()?;
        
        let content = serde_json::to_string_pretty(self)
            .map_err(|e| AppError::InvalidParameters(format!("Failed to serialize favorites config: {}", e)))?;
        
        fs::write(&config_path, content)
            .map_err(AppError::IoError)?;
        
        Ok(())
    }
    
    /// Add or update a favorite image
    pub fn add_favorite(&mut self, path: String, tags: Vec<String>) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        
        self.favorites.insert(path.clone(), FavoriteImage {
            path,
            tags,
            added_at: now,
        });
    }
    
    /// Remove a favorite image
    pub fn remove_favorite(&mut self, path: &str) -> bool {
        self.favorites.remove(path).is_some()
    }
    
    /// Check if an image is favorited
    pub fn is_favorite(&self, path: &str) -> bool {
        self.favorites.contains_key(path)
    }
    
    /// Get all favorites
    pub fn get_all(&self) -> Vec<FavoriteImage> {
        let mut favorites: Vec<FavoriteImage> = self.favorites.values().cloned().collect();
        // Sort by added_at descending (newest first)
        favorites.sort_by(|a, b| b.added_at.cmp(&a.added_at));
        favorites
    }
    
    /// Search favorites by tags
    pub fn search_by_tags(&self, tags: &[String]) -> Vec<FavoriteImage> {
        if tags.is_empty() {
            return self.get_all();
        }
        
        let mut results: Vec<FavoriteImage> = self.favorites
            .values()
            .filter(|fav| {
                // Check if favorite has any of the search tags
                tags.iter().any(|search_tag| {
                    fav.tags.iter().any(|fav_tag| {
                        fav_tag.to_lowercase().contains(&search_tag.to_lowercase())
                    })
                })
            })
            .cloned()
            .collect();
        
        // Sort by added_at descending (newest first)
        results.sort_by(|a, b| b.added_at.cmp(&a.added_at));
        results
    }
    
    /// Get all unique tags
    pub fn get_all_tags(&self) -> Vec<String> {
        let mut tags_set: std::collections::HashSet<String> = std::collections::HashSet::new();
        
        for favorite in self.favorites.values() {
            for tag in &favorite.tags {
                tags_set.insert(tag.clone());
            }
        }
        
        let mut tags: Vec<String> = tags_set.into_iter().collect();
        tags.sort();
        tags
    }
}
