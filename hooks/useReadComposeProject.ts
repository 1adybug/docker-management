import { useMutation, UseMutationOptions } from "@tanstack/react-query"
import { createRequestFn } from "deepsea-tools"

import { readComposeProjectAction } from "@/actions/readComposeProject"

export const readComposeProjectClient = createRequestFn(readComposeProjectAction)

export interface UseReadComposeProjectParams<TOnMutateResult = unknown> extends Omit<
    UseMutationOptions<Awaited<ReturnType<typeof readComposeProjectClient>>, Error, Parameters<typeof readComposeProjectClient>[0], TOnMutateResult>,
    "mutationFn"
> {}

export function useReadComposeProject<TOnMutateResult = unknown>({ ...rest }: UseReadComposeProjectParams<TOnMutateResult> = {}) {
    return useMutation({
        mutationFn: readComposeProjectClient,
        ...rest,
    })
}
