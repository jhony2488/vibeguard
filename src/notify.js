// Native OS notifications for `watch --notify` (docs/05-watch-and-history.md).
// Best-effort and fire-and-forget: picks the platform's toast mechanism and
// swallows failures — a notification must never break a watch session.
// Tests inject a `notifier` mock instead of touching the OS.

import { execFile } from 'node:child_process';

const SANITIZE = /["'`\\]/g;

export function createNotifier({ execFileImpl = execFile, platform = process.platform } = {}) {
  const fire = (cmd, args) => {
    try {
      execFileImpl(cmd, args, () => {});
    } catch {
      // no notifier available on this platform — stay silent
    }
  };

  const notify = ({ title = 'VibeGuard', message = '' } = {}) => {
    const t = String(title).replace(SANITIZE, '');
    const m = String(message).replace(SANITIZE, '');

    if (platform === 'darwin') {
      fire('osascript', ['-e', `display notification "${m}" with title "${t}"`]);
    } else if (platform === 'win32') {
      fire('powershell', [
        '-NoProfile',
        '-Command',
        `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; ` +
          `$t=[Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent(1); ` +
          `$t.GetElementsByTagName('text').Item(0).AppendChild($t.CreateTextNode('${t}: ${m}')) | Out-Null; ` +
          `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('VibeGuard').Show([Windows.UI.Notifications.ToastNotification]::new($t))`,
      ]);
    } else {
      fire('notify-send', [t, m]);
    }
  };

  return { notify };
}
