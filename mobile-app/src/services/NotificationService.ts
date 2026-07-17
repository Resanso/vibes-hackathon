import RNAndroidNotificationListener from 'react-native-android-notification-listener';
import { threatDetector } from './ThreatDetector';
import { AppRegistry } from 'react-native';

export const headlessNotificationListener = async ({ notification }: any) => {
  if (notification) {
    try {
      let parsed;
      // Depending on library version, notification might be string or object
      if (typeof notification === 'string') {
        parsed = JSON.parse(notification);
      } else {
        parsed = notification;
      }
      
      const title = parsed.title || '';
      const text = parsed.text || '';
      
      // Jangan proses notifikasi dari aplikasi Nera sendiri agar tidak terjadi loop
      if (parsed.app !== 'com.nera.app') {
        await threatDetector.analyzeNotification(title, text, parsed.app || 'unknown');
      }
    } catch (e) {
      console.error('[NotificationService] Error parsing notification:', e);
    }
  }
};

export async function checkAndRequestNotificationPermission() {
  try {
    const status = await RNAndroidNotificationListener.getPermissionStatus();
    console.log('[NotificationService] Permission status:', status);
    
    if (status !== 'authorized') {
      RNAndroidNotificationListener.requestPermission();
    }
  } catch (e) {
    console.warn('[NotificationService] Failed to check permissions:', e);
  }
}
