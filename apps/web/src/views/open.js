/** Open Queue view. Its own URL, its own saved player list. */
import { MODES } from '@ow-gacha/gacha';
import { mountTeamPicker } from '../team-picker.js';

const mode = MODES.open;

export default {
  route: '#/open',
  label: mode.label,
  summary: mode.summary,
  mount: (container) => mountTeamPicker(container, mode.key),
};
