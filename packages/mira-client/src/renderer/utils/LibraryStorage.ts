/**
 * Storage utility for managing library-specific localStorage keys
 * Solves the issue where switching libraries overwrites data
 */

import ConfigStorage from './ConfigStorage'

export interface StorageKeyConfig {
  libraryId?: string | null
  prefix: string
}

/**
 * Storage utility class for managing library-specific localStorage
 */
export class LibraryStorage {
  private static async getLibraryId(): Promise<string | null> {
    // Get current active library ID from server list store
    const stored = await ConfigStorage.getItem('mira-servers')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        return data.activeServerId || data.activeLibraryId || null
      } catch {
        return null
      }
    }
    return null
  }

  /**
   * Generate a library-specific storage key
   * @param prefix - The base prefix (e.g., 'auth', 'media', 'library')
   * @param libraryId - Optional library ID, if not provided, uses current active library
   * @returns Library-specific key like "default_mira_auth" or "lib123_mira_media"
   */
  static async generateKey(prefix: string, libraryId?: string | null): Promise<string> {
    const activeLibraryId = libraryId ?? await this.getLibraryId() ?? 'default'
    return `${activeLibraryId}_mira_${prefix}`
  }

  /**
   * Get item from localStorage with library-specific key
   * @param prefix - The storage prefix
   * @param libraryId - Optional library ID
   * @returns Stored value or null
   */
  static async getItem(prefix: string, libraryId?: string | null): Promise<string | null> {
    const key = await this.generateKey(prefix, libraryId)
    return await ConfigStorage.getItem(key)
  }

  /**
   * Set item in localStorage with library-specific key
   * @param prefix - The storage prefix
   * @param value - Value to store
   * @param libraryId - Optional library ID
   */
  static async setItem(prefix: string, value: string, libraryId?: string | null): Promise<void> {
    const key = await this.generateKey(prefix, libraryId)
    await ConfigStorage.setItem(key, value)
  }

  /**
   * Remove item from localStorage with library-specific key
   * @param prefix - The storage prefix
   * @param libraryId - Optional library ID
   */
  static async removeItem(prefix: string, libraryId?: string | null): Promise<void> {
    const key = await this.generateKey(prefix, libraryId)
    await ConfigStorage.removeItem(key)
  }

  /**
   * Get all library-specific keys for a given prefix
   * @param prefix - The storage prefix
   * @returns Array of library IDs that have data for this prefix
   */
  static getLibrariesWithData(prefix: string): string[] {
    const pattern = new RegExp(`^(.+)_mira_${prefix}$`)
    const libraries: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const match = key.match(pattern)
        if (match) {
          libraries.push(match[1])
        }
      }
    }
    
    return libraries
  }

  /**
   * Clear all data for a specific library
   * @param libraryId - Library ID to clear data for
   */
  static async clearLibraryData(libraryId: string): Promise<void> {
    const pattern = new RegExp(`^${libraryId}_mira_`)
    const keysToRemove: string[] = []

    const allKeys = ConfigStorage.getAllKeys()
    for (const key of allKeys) {
      if (pattern.test(key)) {
        keysToRemove.push(key)
      }
    }

    await Promise.all(keysToRemove.map(key => ConfigStorage.removeItem(key)))
  }

  /**
   * Migrate existing data to new library-specific format
   * This should be called once during the upgrade
   * @param currentLibraryId - The library ID to migrate existing data to
   */
  static async migrateExistingData(currentLibraryId: string = 'default'): Promise<void> {
    const oldKeys = [
      'mira-auth',
      'mira-library',
      'mira-media',
      'mira-upload-history',
      'mira-plugins',
      'mira-settings'
    ]

    for (const oldKey of oldKeys) {
      const value = await ConfigStorage.getItem(oldKey)
      if (value) {
        // Extract the prefix from old key (remove 'mira-' prefix)
        const prefix = oldKey.replace('mira-', '')
        // Store with new library-specific key
        await this.setItem(prefix, value, currentLibraryId)
        // Remove old key
        await ConfigStorage.removeItem(oldKey)
        console.log(`Migrated ${oldKey} to ${await this.generateKey(prefix, currentLibraryId)}`)
      }
    }
  }
}
