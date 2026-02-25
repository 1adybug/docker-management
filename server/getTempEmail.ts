import { defaultEmailDomain } from "@/constants"

export function getTempEmail(phoneNumber: string) {
    return `${crypto.randomUUID()}@${defaultEmailDomain}`
}
