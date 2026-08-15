/**
 * Data migration utility for upgrading to the new library-specific storage system
 */

import { LibraryStorage } from './LibraryStorage'
import ConfigStorage from './ConfigStorage'

export class DataMigration {
  /**
   * Check if migration is needed
   * @returns true if migration is needed
   */
  static async needsMigration(): Promise<boolean> {
    // Check if old storage keys exist
    const oldKeys = [
      'mira-auth',
      'mira-library',
      'mira-media',
      'mira-upload-history',
      'mira-plugins'
    ]

    const checks = await Promise.all(oldKeys.map(key => ConfigStorage.getItem(key)))
    return checks.some(value => value !== null)
  }

  /**
   * Get the current active library ID for migration
   * @returns library ID to migrate data to
   */
  static async getMigrationLibraryId(): Promise<string> {
    // Try to get from library list
    const serverListData = await ConfigStorage.getItem('mira-servers')
    if (serverListData) {
      try {
        const data = JSON.parse(serverListData)
        if (data.activeLibraryId) {
          return data.activeLibraryId
        }
        if (data.libraries && data.libraries.length > 0) {
          return data.libraries[0].id
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Default to 'default' if no library found
    return 'default'
  }

  /**
   * Perform the migration
   * @param targetLibraryId - The library ID to migrate data to
   */
  static async performMigration(targetLibraryId?: string): Promise<void> {
    const libraryId = targetLibraryId || await this.getMigrationLibraryId()

    try {
      // Use LibraryStorage's migration method
      await LibraryStorage.migrateExistingData(libraryId)

      // Mark migration as completed
      await ConfigStorage.setItem('mira-migration-completed', Date.now().toString())

    } catch (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }
  }

  /**
   * Check if migration has been completed
   * @returns true if migration was completed
   */
  static async isMigrationCompleted(): Promise<boolean> {
    return await ConfigStorage.getItem('mira-migration-completed') !== null
  }

  /**
   * Auto-migrate if needed
   * This should be called during app initialization
   */
  static async autoMigrate(): Promise<void> {
    if (await this.isMigrationCompleted()) {
      return
    }

    if (await this.needsMigration()) {
      await this.performMigration()
    } else {
      // Mark as completed even if no migration was needed
      await ConfigStorage.setItem('mira-migration-completed', Date.now().toString())
    }
  }

  /**
   * Force re-migration (for testing or recovery)
   */
  static async forceMigration(targetLibraryId: string): Promise<void> {
    await ConfigStorage.removeItem('mira-migration-completed')
    await this.performMigration(targetLibraryId)
  }
}
