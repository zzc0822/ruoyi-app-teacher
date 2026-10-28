import store from '@/store'
import { getToken } from '@/utils/auth'
import { hasPrivacyConsent } from '@/utils/privacy'

let bootstrapTask = null

async function authenticate() {
  if (!getToken()) {
    await store.dispatch('WxLogin')
  }

  try {
    return await store.dispatch('GetInfo')
  } catch (error) {
    // An expired token can be replaced silently once before showing the login form.
    if (!getToken()) {
      throw error
    }
    await store.dispatch('WxLogin')
    return store.dispatch('GetInfo')
  }
}

/**
 * Share one startup authentication request between App and the login page.
 */
export function bootstrapAuth() {
  if (!hasPrivacyConsent()) {
    return Promise.reject(new Error('PRIVACY_CONSENT_REQUIRED'))
  }

  if (bootstrapTask) {
    return bootstrapTask
  }

  const task = authenticate()
  bootstrapTask = task
  task.then(
    () => {
      if (bootstrapTask === task) bootstrapTask = null
    },
    () => {
      if (bootstrapTask === task) bootstrapTask = null
    }
  )
  return task
}
