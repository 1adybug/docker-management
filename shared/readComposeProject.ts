import { readComposeProjectSchema } from "@/schemas/readComposeProject"

import { createSharedFn } from "@/server/createSharedFn"
import { resolveComposeFiles } from "@/server/docker"
import { readTextFromFile } from "@/server/readTextFromFile"

export interface ComposeProjectFile {
    sourcePath: string
    resolvedPath: string
    content: string
}

export interface ReadComposeProjectResult {
    files: ComposeProjectFile[]
}

export const readComposeProject = createSharedFn({
    name: "readComposeProject",
    schema: readComposeProjectSchema,
})(async function readComposeProject({ composeFiles }) {
    const resolvedComposeFiles = await resolveComposeFiles(composeFiles)
    const files = await Promise.all(
        resolvedComposeFiles.files.map(async (file, index) => {
            const content = await readTextFromFile(file)

            return {
                sourcePath: resolvedComposeFiles.sourceFiles[index],
                resolvedPath: file,
                content,
            } as ComposeProjectFile
        }),
    )

    return {
        files,
    } as ReadComposeProjectResult
})
