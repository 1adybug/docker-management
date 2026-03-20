import { copyFile, mkdir } from "node:fs/promises"
import { join } from "node:path"

import { buildJarDockerImageSchema } from "@/schemas/buildJarDockerImage"
import { dockerImageNameParser } from "@/schemas/dockerImageName"
import { dockerStartCommandParser } from "@/schemas/dockerStartCommand"

import { createSharedFn } from "@/server/createSharedFn"
import { buildDockerImage } from "@/server/docker"
import { getReplaceDockerTemporaryName, inspectDockerImage, replaceDockerImage } from "@/server/dockerImage"
import { createDockerTempDirectory, deleteDockerTempDirectory } from "@/server/dockerTempDirectory"
import { writeTextToFile } from "@/server/writeTextToFile"
import { writeWebFileToPath } from "@/server/writeWebFileToPath"

import { ClientError } from "@/utils/clientError"

export interface BuildJarDockerImageFields {
    imageName: string
    javaImage: string
    startCommand: string
}

export interface PrepareJarBuildContextParams {
    contextDirectory: string
    jarPath: string
    javaImage: string
    startCommand: string
}

export interface BuildJarDockerImageResult {
    name: string
    output: string
    backupName?: string
    skipFollowUp?: boolean
    skipMessage?: string
}

function getDockerfileContent(javaImage: string) {
    return `FROM ${javaImage}

WORKDIR /app

COPY app.jar ./app.jar

COPY start.sh ./start.sh

RUN chmod +x ./start.sh

EXPOSE 8080

CMD ["sh", "./start.sh"]
`
}

function getStartScriptContent(startCommand: string) {
    return `#!/bin/sh
set -e

exec ${startCommand}
`
}

function getUploadFile(formData: FormData) {
    const file = formData.get("file")

    if (!(file instanceof File)) throw new ClientError("请先选择 Jar 文件")

    if (file.size <= 0) throw new ClientError("上传的 Jar 文件不能为空")

    if (!file.name.toLowerCase().endsWith(".jar")) throw new ClientError("仅支持上传 Jar 文件")

    return file
}

function getFormText(formData: FormData, key: string, label: string) {
    const value = formData.get(key)

    if (typeof value !== "string") throw new ClientError(`请先填写${label}`)

    const nextValue = value.trim()

    if (!nextValue) throw new ClientError(`请先填写${label}`)

    return nextValue
}

function getOptionalFormText(formData: FormData, key: string) {
    const value = formData.get(key)

    if (typeof value !== "string") return undefined

    const nextValue = value.trim()

    return nextValue || undefined
}

function getBuildJarDockerImageFields(formData: FormData) {
    const targetName = getOptionalFormText(formData, "targetName")
    const imageName = targetName ? getReplaceDockerTemporaryName(targetName) : dockerImageNameParser(getFormText(formData, "imageName", "镜像名"))
    const javaImage = dockerImageNameParser(getFormText(formData, "javaImage", "Java 镜像"))
    const startCommand = dockerStartCommandParser(getFormText(formData, "startCommand", "启动命令"))

    return {
        imageName,
        javaImage,
        startCommand,
    } as BuildJarDockerImageFields
}

async function prepareBuildContext({ contextDirectory, jarPath, javaImage, startCommand }: PrepareJarBuildContextParams) {
    await mkdir(contextDirectory, { recursive: true })
    await copyFile(jarPath, join(contextDirectory, "app.jar"))
    await writeTextToFile(join(contextDirectory, "Dockerfile"), getDockerfileContent(javaImage))
    await writeTextToFile(join(contextDirectory, "start.sh"), getStartScriptContent(startCommand))
}

export const buildJarDockerImage = createSharedFn<FormData>({
    name: "buildJarDockerImage",
    schema: buildJarDockerImageSchema,
})(async function buildJarDockerImage(formData) {
    const file = getUploadFile(formData)
    const targetName = getOptionalFormText(formData, "targetName")
    const { imageName, javaImage, startCommand } = getBuildJarDockerImageFields(formData)

    const directory = await createDockerTempDirectory({
        prefix: "docker-management-jar-image-",
    })
    const jarPath = join(directory, "source.jar")
    const contextDirectory = join(directory, "context")

    try {
        await writeWebFileToPath({ file, path: jarPath })
        await prepareBuildContext({
            contextDirectory,
            jarPath,
            javaImage,
            startCommand,
        })

        const output = await buildDockerImage({
            cwd: contextDirectory,
            name: imageName,
        })

        if (!targetName) {
            return {
                name: imageName,
                output,
            } as BuildJarDockerImageResult
        }

        const image = await inspectDockerImage(imageName)
        const replaceResult = await replaceDockerImage({
            newImageId: image.id,
            targetName,
            temporaryName: imageName,
        })

        return {
            backupName: replaceResult.backupName,
            name: targetName,
            output,
            skipFollowUp: replaceResult.skipFollowUp,
            skipMessage: replaceResult.skipMessage,
        } as BuildJarDockerImageResult
    } finally {
        await deleteDockerTempDirectory(directory)
    }
})
