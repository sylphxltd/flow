/**
 * Notification System
 * Provides terminal and OS-level notifications for AI responses
 */

// Terminal notification with sound
export function sendTerminalNotification(title: string, message: string, options?: {
  sound?: string;
  duration?: number;
}) {
  const { sound = 'glass', duration = 3000 } = options || {};
  
  // Play system sound (macOS)
  if (process.platform === 'darwin') {
    const { spawn } = require('child_process');
    spawn('afplay', ['/System/Library/Sounds/Glass.aiff'], { 
      stdio: 'ignore' 
    }).unref();
  }
  
  // Terminal bell with visual feedback
  console.log('\u0007'); // Bell character
  
  // ANSI escape codes for visual notification
  const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    fg: {
      green: '\x1b[32m',
      blue: '\x1b[34m',
      yellow: '\x1b[33m',
    }
  };
  
  // Create notification box
  const border = '─'.repeat(Math.max(title.length + message.length + 4, 50));
  console.log('');
  console.log(`${colors.fg.green}${border}${colors.reset}`);
  console.log(`${colors.bright}${colors.fg.blue}[!] ${title}${colors.reset}`);
  console.log(`${colors.fg.yellow}   ${message}${colors.reset}`);
  console.log(`${colors.fg.green}${border}${colors.reset}`);
  console.log('');
}

// OS-level notification using system APIs
export async function sendOSNotification(title: string, message: string, options?: {
  icon?: string;
  urgency?: 'low' | 'normal' | 'critical';
  sound?: boolean;
  timeout?: number;
}) {
  const { 
    icon = '🤖', 
    urgency = 'normal', 
    sound = true,
    timeout = 5000 
  } = options || {};
  
  try {
    if (process.platform === 'darwin') {
      // macOS: use osascript with simplified approach
      const { spawn } = require('child_process');
      
      await new Promise<void>((resolve, reject) => {
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
            // Play sound separately if needed
            if (sound) {
              spawn('afplay', ['/System/Library/Sounds/Glass.aiff'], { 
                stdio: 'ignore',
                detached: true 
              }).unref();
            }
            resolve();
          } else {
            reject(new Error(`osascript failed with code ${code}: ${stderr}`));
          }
        });
        proc.on('error', reject);
      });
      
    } else if (process.platform === 'linux') {
      // Linux: use notify-send
      const { spawn } = require('child_process');
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('notify-send', [
          '--urgency', urgency,
          '--icon', icon,
          '--expire-time', timeout.toString(),
          title,
          message
        ]);
        proc.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`notify-send failed with code ${code}`));
        });
        proc.on('error', reject);
      });
      
    } else if (process.platform === 'win32') {
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
      
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('powershell', ['-Command', powershellScript]);
        proc.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`PowerShell failed with code ${code}`));
        });
        proc.on('error', reject);
      });
    }
  } catch (error) {
    console.warn('Failed to send OS notification:', error);
    // Fallback to terminal notification
    sendTerminalNotification(title, message, { sound: false });
  }
}

// Combined notification - sends both terminal and OS notifications
export function sendNotification(
  title: string, 
  message: string, 
  options?: {
    osNotification?: boolean;
    terminalNotification?: boolean;
    sound?: boolean;
  }
) {
  const {
    osNotification = true,
    terminalNotification = true,
    sound = true
  } = options || {};
  
  if (terminalNotification) {
    sendTerminalNotification(title, message, { sound });
  }
  
  if (osNotification) {
    sendOSNotification(title, message, { sound });
  }
}

// Check if notifications are available
export async function checkNotificationSupport(): Promise<{
  terminalSupported: boolean;
  osSupported: boolean;
  platform: string;
}> {
  return {
    terminalSupported: true, // Always supported
    osSupported: process.platform === 'darwin' || process.platform === 'linux' || process.platform === 'win32',
    platform: process.platform
  };
}