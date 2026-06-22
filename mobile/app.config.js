module.exports = {
  expo: {
    name: "MarinaBooking",
    slug: "marina-booking",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.marinahub.app"
    },
    android: {
      package: "com.marinahub.app",
      googleServicesFile: "./google-services.json",
      usesCleartextTraffic: true,
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png"
      },
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY || "PLACEHOLDER_GOOGLE_MAPS_API_KEY"
        }
      }
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-secure-store",
      [
        "@stripe/stripe-react-native",
        {
          "enableGooglePay": true
        }
      ],
      "@react-native-google-signin/google-signin"
    ],
    extra: {
      eas: {
        projectId: "b8fbdfd7-0115-444a-be78-41578c5e3763"
      }
    }
  }
};
