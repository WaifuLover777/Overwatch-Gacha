/** Vista de Role Queue. Su propia URL, su propia lista de nombres guardada. */
import { MODES } from '@ow-gacha/gacha';
import { mountTeamPicker } from '../team-picker.js';

const mode = MODES['role-queue'];

export default {
  route: '#/role-queue',
  label: mode.label,
  summary: mode.summary,
  mount: (container) => mountTeamPicker(container, mode.key),
};
