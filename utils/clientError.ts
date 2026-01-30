export interface ClientErrorOptions {
    /** 原始错误 */
    origin?: unknown
    /** 错误代码 */
    code?: number
    /** 错误消息 */
    message?: string
}

/** 可以暴露给客户端的错误 */
export class ClientError extends Error {
    /** 原始的错误 */
    origin?: unknown

    /** 错误代码 */
    code?: number

    constructor(messageOrOptions?: string | ClientErrorOptions) {
        if (typeof messageOrOptions === "string") {
            super(messageOrOptions)
            return
        }

        const { message, code, origin } = messageOrOptions ?? {}
        super(message)
        this.origin = origin
        this.code = code
    }
}
