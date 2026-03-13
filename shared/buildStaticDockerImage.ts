import { execFile } from "node:child_process"
import { cp, mkdir, readdir, stat } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { promisify } from "node:util"

import { execAsync } from "soda-nodejs"

import { buildStaticDockerImageSchema } from "@/schemas/buildStaticDockerImage"
import { dockerImageNameParser } from "@/schemas/dockerImageName"

import { createSharedFn } from "@/server/createSharedFn"
import { getReplaceDockerTemporaryName, inspectDockerImage, replaceDockerImage } from "@/server/dockerImage"
import { createDockerTempDirectory, deleteDockerTempDirectory } from "@/server/dockerTempDirectory"
import { isAdmin } from "@/server/isAdmin"
import { writeTextToFile } from "@/server/writeTextToFile"
import { writeWebFileToPath } from "@/server/writeWebFileToPath"

import { ClientError } from "@/utils/clientError"

const execFileAsync = promisify(execFile)
const nodeRequire = createRequire(join(process.cwd(), "package.json"))

const nginxConfigContent = `worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include mime.types;
    # default_type application/octet-stream;

    sendfile on;
    keepalive_timeout 65;

    server {
        listen 80;
        server_name localhost;

        root /usr/share/nginx/html;
        index index.html index.htm;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
`

export interface BuildStaticDockerImageFields {
    imageName: string
    nginxImage: string
}

export interface StaticArchiveFileInfo {
    file: File
    extension: string
}

export interface ExtractArchiveParams {
    archivePath: string
    outputDirectory: string
}

export interface ResolveDistDirectoryParams {
    extractDirectory: string
}

export interface PrepareBuildContextParams {
    contextDirectory: string
    nginxImage: string
    sourceDirectory: string
}

export interface BuildStaticDockerImageResult {
    name: string
    output: string
    backupName?: string
}

function get7zaPath() {
    if (process.env.USE_SYSTEM_7ZA === "true") return "7za"

    const packageJsonPath = nodeRequire.resolve("7zip-bin/package.json")
    const packageDirectory = dirname(packageJsonPath)

    if (process.platform === "win32") return join(packageDirectory, "win", process.arch, "7za.exe")
    if (process.platform === "darwin") return join(packageDirectory, "mac", process.arch, "7za")
    return join(packageDirectory, "linux", process.arch, "7za")
}

function getDockerfileContent(nginxImage: string) {
    return `FROM ${nginxImage}

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY dist .

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`
}

function getUploadFile(formData: FormData) {
    const file = formData.get("file")

    if (!(file instanceof File)) throw new ClientError("请先选择静态文件")

    if (file.size <= 0) throw new ClientError("上传的静态文件不能为空")

    const lowerFileName = file.name.toLowerCase()

    if (lowerFileName.endsWith(".zip")) {
        return {
            file,
            extension: "zip",
        } as StaticArchiveFileInfo
    }

    if (lowerFileName.endsWith(".7z")) {
        return {
            file,
            extension: "7z",
        } as StaticArchiveFileInfo
    }

    throw new ClientError("仅支持上传 zip 或 7z 文件")
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

function getBuildStaticDockerImageFields(formData: FormData) {
    const targetName = getOptionalFormText(formData, "targetName")
    const imageName = targetName ? getReplaceDockerTemporaryName(targetName) : dockerImageNameParser(getFormText(formData, "imageName", "镜像名"))
    const nginxImage = dockerImageNameParser(getFormText(formData, "nginxImage", "nginx 镜像"))

    return {
        imageName,
        nginxImage,
    } as BuildStaticDockerImageFields
}

async function pathExists(path: string) {
    try {
        await stat(path)
        return true
    } catch {
        return false
    }
}

async function resolveDistDirectory({ extractDirectory }: ResolveDistDirectoryParams) {
    const distDirectory = join(extractDirectory, "dist")

    if (await pathExists(distDirectory)) return distDirectory

    const entries = await readdir(extractDirectory, { withFileTypes: true })

    if (entries.length === 0) throw new ClientError("静态文件压缩包内容为空")

    if (entries.length === 1 && entries[0]?.isDirectory()) return join(extractDirectory, entries[0].name)

    return extractDirectory
}

async function extractArchive({ archivePath, outputDirectory }: ExtractArchiveParams) {
    try {
        await execFileAsync(get7zaPath(), ["x", archivePath, `-o${outputDirectory}`, "-y", "-bd", "-bb0"], {
            maxBuffer: 10 * 1024 * 1024,
            windowsHide: true,
        })
    } catch (error) {
        throw new ClientError({
            message: "解压静态文件失败",
            origin: error,
        })
    }
}

async function prepareBuildContext({ contextDirectory, nginxImage, sourceDirectory }: PrepareBuildContextParams) {
    await mkdir(contextDirectory, { recursive: true })
    await cp(sourceDirectory, join(contextDirectory, "dist"), { recursive: true })
    await writeTextToFile(join(contextDirectory, "Dockerfile"), getDockerfileContent(nginxImage))
    await writeTextToFile(join(contextDirectory, "nginx.conf"), nginxConfigContent)
}

export const buildStaticDockerImage = createSharedFn<FormData>({
    name: "buildStaticDockerImage",
    schema: buildStaticDockerImageSchema,
    filter: isAdmin,
})(async function buildStaticDockerImage(formData) {
    const { file, extension } = getUploadFile(formData)
    const targetName = getOptionalFormText(formData, "targetName")
    const { imageName, nginxImage } = getBuildStaticDockerImageFields(formData)

    const directory = await createDockerTempDirectory({
        prefix: "docker-management-static-image-",
    })
    const archivePath = join(directory, `static.${extension}`)
    const extractDirectory = join(directory, "extract")
    const contextDirectory = join(directory, "context")

    try {
        await writeWebFileToPath({ file, path: archivePath })
        await extractArchive({ archivePath, outputDirectory: extractDirectory })

        const sourceDirectory = await resolveDistDirectory({ extractDirectory })

        await prepareBuildContext({
            contextDirectory,
            nginxImage,
            sourceDirectory,
        })

        const output = await execAsync(`docker build -t ${imageName} .`, {
            cwd: contextDirectory,
        })

        if (!targetName) {
            return {
                name: imageName,
                output,
            } as BuildStaticDockerImageResult
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
        } as BuildStaticDockerImageResult
    } finally {
        await deleteDockerTempDirectory(directory)
    }
})
