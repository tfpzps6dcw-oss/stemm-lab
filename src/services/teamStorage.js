import AsyncStorage from '@react-native-async-storage/async-storage';

const TEAM_KEY = '@stemm_lab/team';

/**
 * Saves the team data to local storage.
 * @param {Object} team - The team object
 * @param {string} team.teamName
 * @param {string[]} team.members
 * @param {string} team.grade
 * @param {string} team.discriminator
 */
export async function saveTeam(team) {
  try {
    const json = JSON.stringify(team);
    await AsyncStorage.setItem(TEAM_KEY, json);
  } catch (error) {
    console.error('Failed to save team:', error);
    throw error;
  }
}

/**
 * Loads the saved team data from local storage.
 * Returns null if no team has been saved yet.
 */
export async function loadTeam() {
  try {
    const json = await AsyncStorage.getItem(TEAM_KEY);
    if (json === null) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to load team:', error);
    return null;
  }
}

/**
 * Clears the saved team data. Useful for testing or logout flows.
 */
export async function clearTeam() {
  try {
    await AsyncStorage.removeItem(TEAM_KEY);
  } catch (error) {
    console.error('Failed to clear team:', error);
  }
}