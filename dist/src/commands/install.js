import { installAgents } from '../../install';
import { CLIError } from '../utils/error-handler';
import { COMMON_OPTIONS } from '../utils/command-builder';
function validateInstallOptions(options) {
    if (options.agent && options.agent !== 'opencode') {
        throw new CLIError('Currently only opencode is supported for install.', 'UNSUPPORTED_AGENT');
    }
    options.agent = options.agent || 'opencode';
}
export const installCommand = {
    name: 'install',
    description: 'Install workflow agents for OpenCode',
    options: [
        { ...COMMON_OPTIONS[0], description: 'Force specific agent (opencode)' },
        ...COMMON_OPTIONS.slice(1)
    ],
    handler: async (options) => {
        validateInstallOptions(options);
        await installAgents(options);
    }
};
