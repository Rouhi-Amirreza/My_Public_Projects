# Uber API Integration Setup Guide

This guide will help you set up real Uber API integration for the NaviNook app to enable actual ride requests.

## 🚀 Quick Start

Currently, the app runs in **demo mode** with simulated data. To enable real Uber API integration:

## 1. Register Your App with Uber

1. Go to [Uber Developer Platform](https://developer.uber.com/)
2. Create a new account or sign in
3. Create a new app:
   - **App Name**: NaviNook
   - **App Type**: Transport API
   - **Platform**: Mobile
4. Note down your:
   - **Client ID**
   - **Client Secret**
   - **Server Token** (for backend requests)

## 2. Configure OAuth Settings

In your Uber Developer Dashboard:

1. Go to **Authentication** tab
2. Set **Redirect URI**: `navinook://uber-callback`
3. Enable required **Scopes**:
   - `request` - Request rides on behalf of users
   - `request_receipt` - Get receipt information  
   - `profile` - Access user profile
   - `history` - Access ride history

## 3. Environment Configuration

Create a `.env` file in your project root:

```bash
# Uber API Configuration
UBER_CLIENT_ID=your_client_id_here
UBER_CLIENT_SECRET=your_client_secret_here
UBER_REDIRECT_URI=navinook://uber-callback
UBER_DEMO_MODE=false
```

## 4. Install Required Dependencies

```bash
npm install react-native-app-auth
npm install react-native-keychain  # For secure token storage

# For iOS
cd ios && pod install
```

## 5. Platform-Specific Setup

### iOS Configuration

Add to `ios/NaviNook/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.navinook.uber</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>navinook</string>
        </array>
    </dict>
</array>
```

### Android Configuration

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<activity
    android:name="net.openid.appauth.RedirectUriReceiverActivity"
    android:exported="true">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="navinook" />
    </intent-filter>
</activity>
```

## 6. Update UberService for Production

The current `UberService.ts` is ready for production. When you set `UBER_DEMO_MODE=false`, it will:

- Use real OAuth authentication
- Make actual API calls to Uber
- Handle real ride requests
- Manage token refresh automatically

## 7. Testing Modes

### Demo Mode (Current)
- **UBER_DEMO_MODE=true** (default)
- Simulated data and responses
- No real API calls
- Perfect for development and testing

### Production Mode
- **UBER_DEMO_MODE=false**
- Real Uber API integration
- Requires valid credentials
- Real ride requests and billing

## 🔧 Features Available

### Current Demo Features ✅
- ✅ Price estimates with realistic calculations
- ✅ Multiple Uber product types (UberX, XL, Comfort, Black)
- ✅ Distance and duration calculations
- ✅ Demo ride request flow
- ✅ Simulated driver and vehicle information

### Production Features (When Real API is Enabled) 🚀
- 🚀 Real-time price estimates
- 🚀 Actual ride requests
- 🚀 Live ride tracking
- 🚀 Driver communication
- 🚀 Payment processing
- 🚀 Ride history
- 🚀 Receipt generation

## 🔒 Security Considerations

1. **Never commit API keys** to version control
2. **Use secure token storage** (react-native-keychain)
3. **Implement token refresh** logic
4. **Add rate limiting** for API calls
5. **Validate all user inputs** before API calls
6. **Handle network failures** gracefully

## 📱 User Experience Flow

### Demo Mode
1. User opens Drive Test tab
2. Shows "Demo Mode" authentication status
3. User enters locations and gets estimates
4. User can "request" demo rides
5. Shows simulated ride status

### Production Mode
1. User opens Drive Test tab
2. User authenticates with Uber OAuth
3. User enters locations and gets real estimates
4. User requests actual rides
5. Real-time ride tracking and communication

## 🛠️ Development Tips

1. **Start with demo mode** for development
2. **Test OAuth flow** in a separate branch
3. **Use Uber Sandbox** for testing (if available)
4. **Implement proper error handling**
5. **Add logging** for debugging API issues

## 🆘 Troubleshooting

### Common Issues

1. **OAuth Redirect Not Working**
   - Check redirect URI configuration
   - Verify URL scheme setup
   - Test deep linking

2. **API Authentication Fails**
   - Verify client credentials
   - Check scope permissions
   - Ensure tokens are not expired

3. **Ride Requests Fail**
   - Verify user authentication
   - Check location permissions
   - Ensure valid coordinates

## 📞 Support

- **Uber Developer Support**: [developer.uber.com/support](https://developer.uber.com/support)
- **API Documentation**: [developer.uber.com/docs](https://developer.uber.com/docs)
- **Rate Limits**: Check your dashboard for API limits

---

**Note**: This integration requires approval from Uber for production use. Contact Uber Developer Support for production access and API rate limit increases.