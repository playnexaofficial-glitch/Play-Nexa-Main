import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.playnexa.app',
  appName: 'Play Nexa',

  // webDir: the Next.js static export folder
  // APK loads from THIS folder — works offline!
  webDir: 'out',

  // NO server.url — load from bundled files
  // This is the KEY change for offline support

  server: {
    // No url — uses bundled files
    androidScheme: 'https',
    cleartext: false,
    allowNavigation: [
      // Allow these domains for API calls
      '*.supabase.co',
      '*.firebase.com',
      '*.firebaseapp.com',
      '*.googleapis.com',
      'www.youtube.com',
      '*.youtube.com',
      'unavatar.io',
      '*.ytimg.com',
      'play-nexa.vercel.app',
    ],
  },

  android: {
    allowMixedContent: false,
    backgroundColor: '#0D0D0D',
    captureInput: true,
    webContentsDebuggingEnabled: false,
    // Handle file:// to https:// conversion
    path: 'android',
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#CC0000',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      launchFadeOutDuration: 300,
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0D0D0D',
      overlaysWebView: false,
    },
  },
}

export default config
