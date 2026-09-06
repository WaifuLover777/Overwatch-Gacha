/** Vista de Open Queue. Su propia URL, su propia lista de nombres guardada. */
import { MODES } from '@ow-gacha/gacha';
import { mountTeamPicker } from '../team-picker.js';

const mode = MODES.open;

export default {
  route: '#/open',
  label: mode.label,
  summary: mode.summary,
  mount: (container) => mountTeamPicker(container, mode.key),
};
