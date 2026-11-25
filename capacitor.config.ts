import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nyeinbakery.app',
  appName: 'Nyein Bakery',
  webDir: 'public',
  server: {
    url: 'https://nyein-birthday-cake.vercel.app',
    cleartext: false,
  },
};

export default config;