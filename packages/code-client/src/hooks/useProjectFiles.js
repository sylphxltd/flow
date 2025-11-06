/**
 * Project Files Hook
 * Loads project files on mount for @file auto-completion
 */
import { useEffect, useState } from 'react';
import { scanProjectFiles } from '@sylphx/code-core';
export function useProjectFiles() {
    const [projectFiles, setProjectFiles] = useState([]);
    const [filesLoading, setFilesLoading] = useState(false);
    useEffect(() => {
        const loadFiles = async () => {
            setFilesLoading(true);
            try {
                const files = await scanProjectFiles(process.cwd());
                setProjectFiles(files);
            }
            catch (error) {
                console.error('Failed to load project files:', error);
            }
            finally {
                setFilesLoading(false);
            }
        };
        loadFiles();
    }, []);
    return { projectFiles, filesLoading };
}
//# sourceMappingURL=useProjectFiles.js.map