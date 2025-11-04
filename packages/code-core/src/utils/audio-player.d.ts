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
/**
 * Audio player configuration
 */
interface AudioPlayer {
    name: string;
    command: string;
    args: (filePath: string) => string[];
    platforms: NodeJS.Platform[];
    checkAvailability?: () => Promise<boolean>;
}
/**
 * Detect the first available audio player for current platform
 */
export declare function detectAudioPlayer(): Promise<AudioPlayer | null>;
/**
 * Play audio file using the best available player
 * @param filePath Absolute path to audio file
 * @param options Playback options
 * @returns Promise that resolves when playback completes or rejects on error
 */
export declare function playSound(filePath: string, options?: {
    volume?: number;
    background?: boolean;
    timeout?: number;
}): Promise<void>;
/**
 * Get information about the detected audio player
 */
export declare function getAudioPlayerInfo(): Promise<{
    available: boolean;
    player: string | null;
    platform: string;
}>;
/**
 * Built-in system sounds for different platforms
 */
export declare const SYSTEM_SOUNDS: {
    readonly darwin: {
        readonly glass: "/System/Library/Sounds/Glass.aiff";
        readonly hero: "/System/Library/Sounds/Hero.aiff";
        readonly pop: "/System/Library/Sounds/Pop.aiff";
        readonly ping: "/System/Library/Sounds/Ping.aiff";
        readonly purr: "/System/Library/Sounds/Purr.aiff";
        readonly submarine: "/System/Library/Sounds/Submarine.aiff";
        readonly blow: "/System/Library/Sounds/Blow.aiff";
        readonly bottle: "/System/Library/Sounds/Bottle.aiff";
        readonly frog: "/System/Library/Sounds/Frog.aiff";
        readonly funk: "/System/Library/Sounds/Funk.aiff";
        readonly morse: "/System/Library/Sounds/Morse.aiff";
    };
    readonly linux: {
        readonly complete: "/usr/share/sounds/freedesktop/stereo/complete.oga";
        readonly message: "/usr/share/sounds/freedesktop/stereo/message.oga";
        readonly bell: "/usr/share/sounds/freedesktop/stereo/bell.oga";
        readonly dialog: "/usr/share/sounds/freedesktop/stereo/dialog-information.oga";
    };
    readonly win32: {
        readonly notify: "C:\\Windows\\Media\\Windows Notify.wav";
        readonly ding: "C:\\Windows\\Media\\Windows Ding.wav";
        readonly chord: "C:\\Windows\\Media\\chord.wav";
    };
};
/**
 * Get default system sound for current platform
 */
export declare function getDefaultSystemSound(): string | null;
/**
 * Play system notification sound
 */
export declare function playNotificationSound(): Promise<void>;
export {};
//# sourceMappingURL=audio-player.d.ts.map