const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withNotificationService(config) {
  return withAndroidManifest(config, async config => {
    const androidManifest = config.modResults;
    const manifest = androidManifest.manifest;
    const application = manifest.application[0];

    // Ensure tools namespace exists
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Fix manifest merger conflict for allowBackup
    if (!application.$['tools:replace']) {
      application.$['tools:replace'] = 'android:allowBackup';
    } else if (!application.$['tools:replace'].includes('android:allowBackup')) {
      application.$['tools:replace'] += ',android:allowBackup';
    }

    // Ensure services array exists
    if (!application.service) {
      application.service = [];
    }

    // Add the NotificationListenerService
    const hasService = application.service.some(
      s => s.$['android:name'] === 'com.npm.reactnativeandroidnotificationlistener.RNAndroidNotificationListener'
    );

    if (!hasService) {
      application.service.push({
        $: {
          'android:name': 'com.npm.reactnativeandroidnotificationlistener.RNAndroidNotificationListener',
          'android:label': '@string/app_name',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    return config;
  });
};
