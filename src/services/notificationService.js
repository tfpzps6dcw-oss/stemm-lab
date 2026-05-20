// STEM-144: Notification service — wraps expo-notifications for permission + scheduling.
//
// Two public functions:
//   requestPermission()     — prompts user (idempotent)
//   scheduleTimerWarning()  — schedule a local notification before a timer expires
//
// Web is a no-op (expo-notifications doesn't function in the browser).

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const IS_WEB = Platform.OS === 'web';

// STEM-144: Set how notifications display when the app is in the foreground.
// Without this, foreground notifications are silently dropped on iOS.
if (!IS_WEB) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Request notification permission from the user.
 * Returns 'granted' | 'denied' | 'undetermined' | 'unavailable'.
 */
export async function requestPermission() {
  if (IS_WEB) return 'unavailable';

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') return 'granted';

  const result = await Notifications.requestPermissionsAsync();
  return result.status; // 'granted' | 'denied' | 'undetermined'
}

/**
 * Check current permission without prompting.
 */
export async function getPermissionStatus() {
  if (IS_WEB) return 'unavailable';
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/**
 * Schedule a local notification N seconds in the future.
 *
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {number} opts.delaySec  — seconds from now to fire
 * @returns {Promise<string|null>} — the notification id (used to cancel), or null on web
 */
export async function scheduleNotification({ title, body, delaySec }) {
  if (IS_WEB) return null;
  if (delaySec <= 0) return null;

  // Native: use expo-notifications
  const id = await Notifications.scheduleNotificationAsync({
    content: { title, body },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySec,
    },
  });
  return id;
}

/**
 * Convenience helper used by activity timers.
 * Schedules a "X minutes left" warning a configurable lead time before the timer expires.
 *
 * @param {Object} opts
 * @param {number} opts.totalSec       — total timer duration
 * @param {number} [opts.leadSec=120]  — fire this many seconds before expiry
 * @param {string} [opts.activityName] — included in notification body
 */
export async function scheduleTimerWarning({ totalSec, leadSec = 120, activityName }) {
  const delay = totalSec - leadSec;
  if (delay <= 0) return null;

  const remainingText =
    leadSec >= 60
      ? (() => {
          const m = Math.round(leadSec / 60);
          return m === 1 ? '1 minute' : `${m} minutes`;
        })()
      : `${leadSec} second${leadSec === 1 ? '' : 's'}`;

  return scheduleNotification({
    title: 'Almost up!',
    body: activityName
      ? `${remainingText} left on ${activityName}.`
      : `${remainingText} left on your activity timer.`,
    delaySec: delay,
  });
}

/**
 * Cancel a previously-scheduled notification.
 */
export async function cancelNotification(id) {
  if (IS_WEB || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Cancel all pending notifications. Useful on sign-out.
 */
export async function cancelAllNotifications() {
  if (IS_WEB) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}