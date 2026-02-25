import { md5 } from "./md5"

export function getRandomPassword() {
    return md5(crypto.randomUUID())
}
