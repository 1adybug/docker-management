export interface GetDockerBaseImageLabelParams {
    baseImage: string
}

export function getDockerBaseImageLabel({ baseImage }: GetDockerBaseImageLabelParams) {
    return `LABEL docker-management.base-image=${JSON.stringify(baseImage)}`
}
