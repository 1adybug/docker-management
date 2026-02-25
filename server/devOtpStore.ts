const store = new Map<string, string>()

export interface DevOtpPhoneKey {
    phoneNumber: string
    email?: undefined
    type?: undefined
}

export interface DevOtpEmailKey {
    phoneNumber?: undefined
    email: string
    type: "sign-in" | "email-verification" | "forget-password"
}

export type DevOtpKey = DevOtpPhoneKey | DevOtpEmailKey

function getDevOtpKey(key: DevOtpKey) {
    return JSON.stringify(key)
}

export function setDevOtp(key: DevOtpKey, otp: string) {
    store.set(getDevOtpKey(key), otp)
}

export function getDevOtp(key: DevOtpKey) {
    return store.get(getDevOtpKey(key))
}

export function removeDevOtp(key: DevOtpKey) {
    store.delete(getDevOtpKey(key))
}
