#[cfg(test)]
mod tests {
    use crate::favorites::FavoritesConfig;
    use std::fs;
    use std::path::PathBuf;

    fn get_test_config_path() -> PathBuf {
        let temp_dir = std::env::temp_dir();
        temp_dir.join("simpleimageviewer_test_favorites.json")
    }

    fn cleanup_test_config() {
        let path = get_test_config_path();
        if path.exists() {
            let _ = fs::remove_file(path);
        }
    }

    #[test]
    fn test_add_and_get_favorite() {
        cleanup_test_config();

        let mut config = FavoritesConfig::default();
        
        config.add_favorite(
            "/path/to/image1.png".to_string(),
            vec!["nature".to_string(), "landscape".to_string()]
        );

        assert!(config.is_favorite("/path/to/image1.png"));
        assert!(!config.is_favorite("/path/to/image2.png"));

        let favorites = config.get_all();
        assert_eq!(favorites.len(), 1);
        assert_eq!(favorites[0].path, "/path/to/image1.png");
        assert_eq!(favorites[0].tags.len(), 2);

        cleanup_test_config();
    }

    #[test]
    fn test_remove_favorite() {
        cleanup_test_config();

        let mut config = FavoritesConfig::default();
        
        config.add_favorite(
            "/path/to/image1.png".to_string(),
            vec!["nature".to_string()]
        );

        assert!(config.is_favorite("/path/to/image1.png"));

        let removed = config.remove_favorite("/path/to/image1.png");
        assert!(removed);
        assert!(!config.is_favorite("/path/to/image1.png"));

        let removed_again = config.remove_favorite("/path/to/image1.png");
        assert!(!removed_again);

        cleanup_test_config();
    }

    #[test]
    fn test_search_by_tags() {
        cleanup_test_config();

        let mut config = FavoritesConfig::default();
        
        config.add_favorite(
            "/path/to/image1.png".to_string(),
            vec!["nature".to_string(), "landscape".to_string()]
        );
        
        config.add_favorite(
            "/path/to/image2.png".to_string(),
            vec!["portrait".to_string(), "people".to_string()]
        );
        
        config.add_favorite(
            "/path/to/image3.png".to_string(),
            vec!["nature".to_string(), "wildlife".to_string()]
        );

        // Search for "nature" tag
        let results = config.search_by_tags(&vec!["nature".to_string()]);
        assert_eq!(results.len(), 2);

        // Search for "portrait" tag
        let results = config.search_by_tags(&vec!["portrait".to_string()]);
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].path, "/path/to/image2.png");

        // Search for non-existent tag
        let results = config.search_by_tags(&vec!["architecture".to_string()]);
        assert_eq!(results.len(), 0);

        // Empty search returns all
        let results = config.search_by_tags(&vec![]);
        assert_eq!(results.len(), 3);

        cleanup_test_config();
    }

    #[test]
    fn test_get_all_tags() {
        cleanup_test_config();

        let mut config = FavoritesConfig::default();
        
        config.add_favorite(
            "/path/to/image1.png".to_string(),
            vec!["nature".to_string(), "landscape".to_string()]
        );
        
        config.add_favorite(
            "/path/to/image2.png".to_string(),
            vec!["portrait".to_string(), "nature".to_string()]
        );

        let tags = config.get_all_tags();
        assert_eq!(tags.len(), 3); // nature, landscape, portrait (unique)
        assert!(tags.contains(&"nature".to_string()));
        assert!(tags.contains(&"landscape".to_string()));
        assert!(tags.contains(&"portrait".to_string()));

        cleanup_test_config();
    }

    #[test]
    fn test_update_favorite_tags() {
        cleanup_test_config();

        let mut config = FavoritesConfig::default();
        
        config.add_favorite(
            "/path/to/image1.png".to_string(),
            vec!["nature".to_string()]
        );

        // Update tags by adding again with different tags
        config.add_favorite(
            "/path/to/image1.png".to_string(),
            vec!["nature".to_string(), "landscape".to_string(), "sunset".to_string()]
        );

        let favorites = config.get_all();
        assert_eq!(favorites.len(), 1);
        assert_eq!(favorites[0].tags.len(), 3);

        cleanup_test_config();
    }
}
