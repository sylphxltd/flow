/**
 * Notification System
 * Provides terminal and OS-level notifications for AI responses
 */
export declare function sendTerminalNotification(title: string, message: string, options?: {
    sound?: boolean;
    duration?: number;
}): void;
export declare function sendOSNotification(title: string, message: string, options?: {
    icon?: string;
    urgency?: 'low' | 'normal' | 'critical';
    sound?: boolean;
    timeout?: number;
}): Promise<void>;
export declare function sendNotification(title: string, message: string, options?: {
    osNotification?: boolean;
    terminalNotification?: boolean;
    sound?: boolean;
}): void;
export declare function checkNotificationSupport(): Promise<{
    terminalSupported: boolean;
    osSupported: boolean;
    platform: string;
}>;
//# sourceMappingURL=notifications.d.ts.map