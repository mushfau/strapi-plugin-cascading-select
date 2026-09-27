import type { PluginConfig } from '../types';

export default {
  default: {
    // Upper bound of options returned for a single dropdown.
    maxOptions: 1000,
  } satisfies PluginConfig,
  validator(config: PluginConfig) {
    if (!Number.isInteger(config.maxOptions) || config.maxOptions < 1) {
      throw new Error('cascading-select: `maxOptions` must be a positive integer');
    }
  },
};
