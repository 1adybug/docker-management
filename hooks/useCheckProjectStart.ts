import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { checkProjectStartAction } from "@/actions/checkProjectStart"

export const checkProjectStartClient = createRequestFn(checkProjectStartAction)

export interface UseCheckProjectStartParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof checkProjectStartClient>>, Error, Parameters<typeof checkProjectStartClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useCheckProjectStart<TOnMutateResult = unknown>({ ...rest }: UseCheckProjectStartParams<TOnMutateResult> = {}) {
    return useMutation({
        mutationFn: checkProjectStartClient,
        ...rest,
    })
}
