const DefaultEmailDomain = "example.com"

export function getDefaultEmailDomain() {
    return process.env.DEFAULT_EMAIL_DOMAIN?.trim() || DefaultEmailDomain
}

export function getTempEmail(phoneNumber: string) {
    const defaultEmailDomain = getDefaultEmailDomain()
    return `${crypto.randomUUID()}@${defaultEmailDomain}`
}
