/**
 * Cross-Platform Audio Player
 * Detects and uses available audio players across different platforms
 *
 * Supported players (in priority order):
 * - macOS: afplay (built-in)
 * - Linux: mpg123, mpg321, play (sox), aplay, mplayer, cvlc
 * - Windows: powershell (built-in), cmdmp3
 * - Universal: mplayer, omxplayer (Raspberry Pi)
 */
import { spawn } from 'child_process';
import { existsSync } from 'fs';
/**
 * Available audio players in priority order
 */
const AUDIO_PLAYERS = [
    // macOS built-in
    {
        name: 'afplay',
        command: 'afplay',
        args: (file) => [file],
        platforms: ['darwin'],
    },
    // Linux players (in priority order)
    {
        name: 'mpg123',
        command: 'mpg123',
        args: (file) => ['-q', file], // quiet mode
        platforms: ['linux', 'freebsd', 'openbsd'],
    },
    {
        name: 'mpg321',
        command: 'mpg321',
        args: (file) => ['-q', file], // quiet mode
        platforms: ['linux', 'freebsd', 'openbsd'],
    },
    {
        name: 'play',
        command: 'play',
        args: (file) => ['-q', file], // sox play command
        platforms: ['linux', 'freebsd', 'openbsd', 'darwin'],
    },
    {
        name: 'aplay',
        command: 'aplay',
        args: (file) => ['-q', file], // ALSA player
        platforms: ['linux'],
    },
    {
        name: 'mplayer',
        command: 'mplayer',
        args: (file) => ['-really-quiet', file],
        platforms: ['linux', 'freebsd', 'openbsd', 'darwin', 'win32'],
    },
    {
        name: 'cvlc',
        command: 'cvlc',
        args: (file) => ['--play-and-exit', '--quiet', file], // VLC command-line
        platforms: ['linux', 'freebsd', 'openbsd', 'darwin', 'win32'],
    },
    {
        name: 'omxplayer',
        command: 'omxplayer',
        args: (file) => ['-o', 'local', file], // Raspberry Pi
        platforms: ['linux'],
    },
    // Windows players
    {
        name: 'powershell',
        command: 'powershell',
        args: (file) => [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            `(New-Object Media.SoundPlayer "${file}").PlaySync()`
        ],
        platforms: ['win32'],
        // PowerShell Media.SoundPlayer only supports WAV files
        checkAvailability: async () => {
            // Check if we're on Windows and file is WAV
            return process.platform === 'win32';
        }
    },
    {
        name: 'cmdmp3',
        command: 'cmdmp3',
        args: (file) => [file],
        platforms: ['win32'],
    },
];
/**
 * Cached available player to avoid repeated checks
 */
let cachedPlayer = null;
let cacheChecked = false;
/**
 * Check if a command is available in PATH
 */
async function isCommandAvailable(command) {
    return new Promise((resolve) => {
        // Try to execute the command with --version or --help
        const proc = spawn(command, ['--version'], {
            stdio: 'ignore',
            shell: true
        });
        proc.on('error', () => resolve(false));
        proc.on('exit', (code) => {
            // Some commands return non-zero for --version, so just check if they exist
            resolve(true);
        });
        // Timeout after 1 second
        setTimeout(() => {
            proc.kill();
            resolve(false);
        }, 1000);
    });
}
/**
 * Detect the first available audio player for current platform
 */
export async function detectAudioPlayer() {
    if (cacheChecked && cachedPlayer) {
        return cachedPlayer;
    }
    const currentPlatform = process.platform;
    // Filter players for current platform
    const compatiblePlayers = AUDIO_PLAYERS.filter((player) => player.platforms.includes(currentPlatform));
    // Check each player in priority order
    for (const player of compatiblePlayers) {
        // Custom availability check if provided
        if (player.checkAvailability) {
            const isAvailable = await player.checkAvailability();
            if (!isAvailable)
                continue;
        }
        // Check if command is available
        const isAvailable = await isCommandAvailable(player.command);
        if (isAvailable) {
            cachedPlayer = player;
            cacheChecked = true;
            return player;
        }
    }
    cacheChecked = true;
    return null;
}
/**
 * Play audio file using the best available player
 * @param filePath Absolute path to audio file
 * @param options Playback options
 * @returns Promise that resolves when playback completes or rejects on error
 */
export async function playSound(filePath, options) {
    const { background = true, timeout = 5000 } = options || {};
    // Check if file exists
    if (!existsSync(filePath)) {
        throw new Error(`Audio file not found: ${filePath}`);
    }
    // Detect available player
    const player = await detectAudioPlayer();
    if (!player) {
        throw new Error('No audio player available on this system');
    }
    return new Promise((resolve, reject) => {
        const args = player.args(filePath);
        const proc = spawn(player.command, args, {
            stdio: 'ignore',
            detached: background,
        });
        // If background mode, unref and resolve immediately
        if (background) {
            proc.unref();
            resolve();
            return;
        }
        // Otherwise wait for completion
        let timeoutId = null;
        proc.on('error', (error) => {
            if (timeoutId)
                clearTimeout(timeoutId);
            reject(new Error(`Audio player error: ${error.message}`));
        });
        proc.on('exit', (code) => {
            if (timeoutId)
                clearTimeout(timeoutId);
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`Audio player exited with code ${code}`));
            }
        });
        // Timeout protection
        if (timeout > 0) {
            timeoutId = setTimeout(() => {
                proc.kill();
                reject(new Error(`Audio playback timeout after ${timeout}ms`));
            }, timeout);
        }
    });
}
/**
 * Get information about the detected audio player
 */
export async function getAudioPlayerInfo() {
    const player = await detectAudioPlayer();
    return {
        available: player !== null,
        player: player?.name || null,
        platform: process.platform
    };
}
/**
 * Built-in system sounds for different platforms
 */
export const SYSTEM_SOUNDS = {
    // macOS system sounds
    darwin: {
        glass: '/System/Library/Sounds/Glass.aiff',
        hero: '/System/Library/Sounds/Hero.aiff',
        pop: '/System/Library/Sounds/Pop.aiff',
        ping: '/System/Library/Sounds/Ping.aiff',
        purr: '/System/Library/Sounds/Purr.aiff',
        submarine: '/System/Library/Sounds/Submarine.aiff',
        blow: '/System/Library/Sounds/Blow.aiff',
        bottle: '/System/Library/Sounds/Bottle.aiff',
        frog: '/System/Library/Sounds/Frog.aiff',
        funk: '/System/Library/Sounds/Funk.aiff',
        morse: '/System/Library/Sounds/Morse.aiff',
    },
    // Linux typical locations (may vary)
    linux: {
        complete: '/usr/share/sounds/freedesktop/stereo/complete.oga',
        message: '/usr/share/sounds/freedesktop/stereo/message.oga',
        bell: '/usr/share/sounds/freedesktop/stereo/bell.oga',
        dialog: '/usr/share/sounds/freedesktop/stereo/dialog-information.oga',
    },
    // Windows - would need .wav files
    win32: {
        // Windows Media directory sounds
        notify: 'C:\\Windows\\Media\\Windows Notify.wav',
        ding: 'C:\\Windows\\Media\\Windows Ding.wav',
        chord: 'C:\\Windows\\Media\\chord.wav',
    }
};
/**
 * Get default system sound for current platform
 */
export function getDefaultSystemSound() {
    const platform = process.platform;
    if (platform === 'darwin') {
        return SYSTEM_SOUNDS.darwin.glass;
    }
    else if (platform === 'linux') {
        // Check which sound exists
        const sounds = Object.values(SYSTEM_SOUNDS.linux);
        for (const sound of sounds) {
            if (existsSync(sound)) {
                return sound;
            }
        }
    }
    else if (platform === 'win32') {
        // Check which sound exists
        const sounds = Object.values(SYSTEM_SOUNDS.win32);
        for (const sound of sounds) {
            if (existsSync(sound)) {
                return sound;
            }
        }
    }
    return null;
}
/**
 * Play system notification sound
 */
export async function playNotificationSound() {
    const soundPath = getDefaultSystemSound();
    if (!soundPath) {
        // No system sound available, just return silently
        return;
    }
    try {
        await playSound(soundPath, { background: true, timeout: 3000 });
    }
    catch (error) {
        // Fail silently - don't crash on sound playback errors
        if (process.env.DEBUG) {
            console.error('[Audio] Failed to play notification sound:', error);
        }
    }
}
//# sourceMappingURL=audio-player.js.map