import { syncRules } from '../../sync';
import { CLIError } from '../utils/error-handler';
import { COMMON_OPTIONS } from '../utils/command-builder';
function validateSyncOptions(options) {
    if (options.agent && !['cursor', 'kilocode', 'roocode'].includes(options.agent)) {
        throw new CLIError(`Invalid agent: ${options.agent}. Supported agents: cursor, kilocode, roocode`, 'INVALID_AGENT');
    }
}
export const syncCommand = {
    name: 'sync',
    description: 'Sync development rules to your project',
    options: [
        { ...COMMON_OPTIONS[0], description: 'Force specific agent (cursor, kilocode, roocode)' },
        ...COMMON_OPTIONS.slice(1)
    ],
    handler: syncRules,
    validator: validateSyncOptions
};
