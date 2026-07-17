import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';
import { headlessNotificationListener } from './src/services/NotificationService';

// Mendaftarkan service background listener notifikasi Android
AppRegistry.registerHeadlessTask('RNAndroidNotificationListenerHeadlessJs', () => headlessNotificationListener);

// Mendaftarkan aplikasi utama
registerRootComponent(App);
