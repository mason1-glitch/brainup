import { repo } from '../data/repo';
import { configureFeedback } from '../ui/feedback';

export const SOUND_SETTING = 'sound';
export const HAPTICS_SETTING = 'haptics';

export async function loadFeedback(): Promise<{ sound: boolean; haptics: boolean }> {
  const [sound, haptics] = await Promise.all([repo.getSetting(SOUND_SETTING, false), repo.getSetting(HAPTICS_SETTING, true)]);
  configureFeedback({ sound, haptics });
  return { sound, haptics };
}
