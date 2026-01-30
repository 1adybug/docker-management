import { $ZodType, flattenError, output, safeParse } from "zod/v4/core"

import { ClientError } from "@/utils/clientError"

export function getParser<T extends $ZodType>(schema: T) {
    return function parser(arg: unknown): output<T> {
        const { data, error } = safeParse(schema, arg)

        if (error) {
            const { formErrors, fieldErrors } = flattenError(error)
            throw new ClientError({
                message: formErrors
                    .concat(
                        Object.values(fieldErrors)
                            .filter(Boolean as unknown as (value: unknown) => value is string[])
                            .flat(),
                    )
                    .join(", "),
                origin: error,
            })
        }

        return data
    }
}
