import { getParser } from "."
import { z } from "zod"

export const domainSchema = z
    .string({ message: "无效的域名" })
    .regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/, { message: "无效的域名" })

export type DomainParams = z.infer<typeof domainSchema>

export const domainParser = getParser(domainSchema)
