import { getToken } from '@/utils/auth'

const PRIVACY_CONSENT_KEY = 'privacyConsentVersion'
const PRIVACY_CONSENT_VERSION = '1'

export function hasPrivacyConsent() {
  try {
    const consentVersion = uni.getStorageSync(PRIVACY_CONSENT_KEY)
    if (consentVersion === PRIVACY_CONSENT_VERSION) {
      return true
    }

    // The previous login page stated that login itself represented agreement.
    // Carry those existing sessions over once, while new users still opt in.
    const hasLegacyConsentGap = consentVersion === '' || consentVersion === undefined || consentVersion === null
    if (hasLegacyConsentGap && getToken()) {
      uni.setStorageSync(PRIVACY_CONSENT_KEY, PRIVACY_CONSENT_VERSION)
      return true
    }

    return false
  } catch (e) {
    return false
  }
}

export function acceptPrivacyConsent() {
  try {
    uni.setStorageSync(PRIVACY_CONSENT_KEY, PRIVACY_CONSENT_VERSION)
    return true
  } catch (e) {
    return false
  }
}
