// Key used to store/retrieve the player's weapon loadout in localStorage
const STORAGE_KEY = 'NOTBM:loadout';

export class LoadoutStore {
  /**
   * Loads the player's saved loadout from localStorage.
   * Returns `null` if no stored loadout exists or parsing fails.
   */
  static load() {
    // Ensure we are in a browser environment with localStorage available
    if (typeof window === 'undefined' || !window.localStorage) return null;

    try {
      // Retrieve serialized loadout from storage
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      // Parse and return the stored loadout object
      return JSON.parse(raw);
    } catch (err) {
      // If something goes wrong, log and return null rather than crashing
      console.warn('[LoadoutStore] Failed to parse stored loadout', err);
      return null;
    }
  }

  /**
   * Saves the given loadout object to localStorage.
   * Gracefully handles errors (e.g., storage full, blocked, etc.)
   * @param {Object} loadout - Player's currently selected weapons/equipment
   */
  static save(loadout) {
    // Ensure environment supports localStorage
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      // Serialize store payload and save
      const payload = JSON.stringify(loadout);
      window.localStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      // Don't break the game if storage fails — just warn
      console.warn('[LoadoutStore] Failed to persist loadout', err);
    }
  }
}
