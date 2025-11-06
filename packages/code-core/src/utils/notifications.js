/**
 * Notification System
 * Provides terminal and OS-level notifications for AI responses
 */
import { playNotificationSound } from './audio-player.js';
// Terminal notification with sound
export function sendTerminalNotification(title, message, options) {
    const { sound = true, duration = 3000 } = options || {};
    // Play system sound using cross-platform audio player
    if (sound) {
        playNotificationSound().catch((error) => {
            // Fail silently - don't crash on sound errors
            if (process.env.DEBUG) {
                console.error('[Notifications] Failed to play sound:', error);
            }
        });
    }
    // Terminal bell only (no visual output to avoid interfering with Ink UI)
    console.log('\u0007'); // Bell character
    // Visual notification removed - interferes with Ink UI
    // Terminal notifications in TUI apps should use Ink components instead
}
// OS-level notification using system APIs
export async function sendOSNotification(title, message, options) {
    const { icon = '🤖', urgency = 'normal', sound = true, timeout = 5000 } = options || {};
    try {
        if (process.platform === 'darwin') {
            // macOS: use osascript with simplified approach
            const { spawn } = require('child_process');
            await new Promise((resolve, reject) => {
                // Simple notification without complex escaping
                const args = [
                    '-e', `display notification "${message.replace(/"/g, '\\"')}" with title "${title.replace(/"/g, '\\"')}"`
                ];
                const proc = spawn('osascript', args, {
                    stdio: 'pipe',
                    env: { ...process.env, PATH: '/usr/bin:/bin:/usr/sbin:/sbin' }
                });
                let stderr = '';
                proc.stderr?.on('data', (data) => {
                    stderr += data.toString();
                });
                proc.on('exit', (code) => {
                    if (code === 0) {
                        // Play sound separately if needed using cross-platform audio player
                        if (sound) {
                            playNotificationSound().catch(() => {
                                // Ignore sound errors
                            });
                        }
                        resolve();
                    }
                    else {
                        reject(new Error(`osascript failed with code ${code}: ${stderr}`));
                    }
                });
                proc.on('error', reject);
            });
        }
        else if (process.platform === 'linux') {
            // Linux: use notify-send
            const { spawn } = require('child_process');
            await new Promise((resolve, reject) => {
                const proc = spawn('notify-send', [
                    '--urgency', urgency,
                    '--icon', icon,
                    '--expire-time', timeout.toString(),
                    title,
                    message
                ]);
                proc.on('exit', (code) => {
                    if (code === 0)
                        resolve();
                    else
                        reject(new Error(`notify-send failed with code ${code}`));
                });
                proc.on('error', reject);
            });
        }
        else if (process.platform === 'win32') {
            // Windows: use PowerShell toast notifications
            const { spawn } = require('child_process');
            const powershellScript = `
        Add-Type -AssemblyName System.Windows.Forms
        $notification = New-Object System.Windows.Forms.NotifyIcon
        $notification.Icon = [System.Drawing.SystemIcons]::Information
        $notification.BalloonTipTitle = "${title}"
        $notification.BalloonTipText = "${message}"
        $notification.BalloonTipIcon = "Info"
        $notification.Visible = $true
        $notification.ShowBalloonTip(${timeout})
        Start-Sleep -Milliseconds ${timeout + 1000}
        $notification.Dispose()
      `;
            await new Promise((resolve, reject) => {
                const proc = spawn('powershell', ['-Command', powershellScript]);
                proc.on('exit', (code) => {
                    if (code === 0)
                        resolve();
                    else
                        reject(new Error(`PowerShell failed with code ${code}`));
                });
                proc.on('error', reject);
            });
        }
    }
    catch (error) {
        console.warn('Failed to send OS notification:', error);
        // Fallback to terminal notification
        sendTerminalNotification(title, message, { sound: false });
    }
}
// Combined notification - sends both terminal and OS notifications
export function sendNotification(title, message, options) {
    const { osNotification = true, terminalNotification = true, sound = true } = options || {};
    if (terminalNotification) {
        sendTerminalNotification(title, message, { sound });
    }
    if (osNotification) {
        sendOSNotification(title, message, { sound });
    }
}
// Check if notifications are available
export async function checkNotificationSupport() {
    return {
        terminalSupported: true, // Always supported
        osSupported: process.platform === 'darwin' || process.platform === 'linux' || process.platform === 'win32',
        platform: process.platform
    };
}
//# sourceMappingURL=notifications.js.map