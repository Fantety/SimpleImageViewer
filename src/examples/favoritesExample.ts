/**
 * Favorites Management Example
 * 
 * This example demonstrates how to use the favorites management API.
 * 
 * Features:
 * - Add images to favorites with tags
 * - Remove images from favorites
 * - Check if an image is favorited
 * - Search favorites by tags
 * - Get all unique tags
 * 
 * The favorites are stored in a JSON configuration file at:
 * - macOS: ~/Library/Application Support/simpleimageviewer/favorites.json
 * - Linux: ~/.config/simpleimageviewer/favorites.json
 * - Windows: %APPDATA%\simpleimageviewer\favorites.json
 */

import {
  addFavorite,
  removeFavorite,
  isFavorite,
  getAllFavorites,
  searchFavoritesByTags,
  getAllTags,
  type FavoriteImage,
} from '../api/tauri';

/**
 * Example 1: Add an image to favorites with tags
 */
async function exampleAddFavorite() {
  const imagePath = '/path/to/image.png';
  const tags = ['nature', 'landscape', 'sunset'];

  try {
    await addFavorite(imagePath, tags);
    console.log('Image added to favorites successfully');
  } catch (error) {
    console.error('Failed to add favorite:', error);
  }
}

/**
 * Example 2: Check if an image is favorited
 */
async function exampleCheckFavorite() {
  const imagePath = '/path/to/image.png';

  try {
    const favorited = await isFavorite(imagePath);
    console.log(`Image is ${favorited ? 'favorited' : 'not favorited'}`);
  } catch (error) {
    console.error('Failed to check favorite status:', error);
  }
}

/**
 * Example 3: Remove an image from favorites
 */
async function exampleRemoveFavorite() {
  const imagePath = '/path/to/image.png';

  try {
    const removed = await removeFavorite(imagePath);
    if (removed) {
      console.log('Image removed from favorites');
    } else {
      console.log('Image was not in favorites');
    }
  } catch (error) {
    console.error('Failed to remove favorite:', error);
  }
}

/**
 * Example 4: Get all favorites
 */
async function exampleGetAllFavorites() {
  try {
    const favorites: FavoriteImage[] = await getAllFavorites();
    console.log(`Found ${favorites.length} favorites:`);
    
    favorites.forEach((fav, index) => {
      console.log(`${index + 1}. ${fav.path}`);
      console.log(`   Tags: ${fav.tags.join(', ')}`);
      console.log(`   Added: ${new Date(fav.added_at * 1000).toLocaleString()}`);
    });
  } catch (error) {
    console.error('Failed to get favorites:', error);
  }
}

/**
 * Example 5: Search favorites by tags
 */
async function exampleSearchByTags() {
  const searchTags = ['nature', 'landscape'];

  try {
    const results: FavoriteImage[] = await searchFavoritesByTags(searchTags);
    console.log(`Found ${results.length} images with tags: ${searchTags.join(', ')}`);
    
    results.forEach((fav, index) => {
      console.log(`${index + 1}. ${fav.path}`);
      console.log(`   Tags: ${fav.tags.join(', ')}`);
    });
  } catch (error) {
    console.error('Failed to search favorites:', error);
  }
}

/**
 * Example 6: Get all unique tags
 */
async function exampleGetAllTags() {
  try {
    const tags: string[] = await getAllTags();
    console.log(`Found ${tags.length} unique tags:`);
    console.log(tags.join(', '));
  } catch (error) {
    console.error('Failed to get tags:', error);
  }
}

/**
 * Example 7: Update tags for an existing favorite
 */
async function exampleUpdateFavoriteTags() {
  const imagePath = '/path/to/image.png';
  const newTags = ['nature', 'landscape', 'sunset', 'mountains'];

  try {
    // Adding a favorite with the same path will update its tags
    await addFavorite(imagePath, newTags);
    console.log('Favorite tags updated successfully');
  } catch (error) {
    console.error('Failed to update favorite tags:', error);
  }
}

/**
 * Example 8: Complete workflow - Add, search, and remove
 */
async function exampleCompleteWorkflow() {
  const imagePath = '/path/to/beautiful-sunset.png';
  const tags = ['nature', 'sunset', 'beach'];

  try {
    // Step 1: Add to favorites
    console.log('Step 1: Adding to favorites...');
    await addFavorite(imagePath, tags);

    // Step 2: Verify it's favorited
    console.log('Step 2: Checking favorite status...');
    const favorited = await isFavorite(imagePath);
    console.log(`Is favorited: ${favorited}`);

    // Step 3: Search by tag
    console.log('Step 3: Searching by "sunset" tag...');
    const results = await searchFavoritesByTags(['sunset']);
    console.log(`Found ${results.length} images with "sunset" tag`);

    // Step 4: Get all tags
    console.log('Step 4: Getting all tags...');
    const allTags = await getAllTags();
    console.log(`All tags: ${allTags.join(', ')}`);

    // Step 5: Remove from favorites
    console.log('Step 5: Removing from favorites...');
    await removeFavorite(imagePath);
    console.log('Workflow completed successfully');
  } catch (error) {
    console.error('Workflow failed:', error);
  }
}

// Export examples for use in other modules
export {
  exampleAddFavorite,
  exampleCheckFavorite,
  exampleRemoveFavorite,
  exampleGetAllFavorites,
  exampleSearchByTags,
  exampleGetAllTags,
  exampleUpdateFavoriteTags,
  exampleCompleteWorkflow,
};
