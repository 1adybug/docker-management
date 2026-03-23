import { execFile } from "node:child_process"
import { createWriteStream } from "node:fs"
import { chmod, cp, mkdir, readdir, stat } from "node:fs/promises"
import { createRequire } from "node:module"
import { dirname, join, relative, resolve } from "node:path"
import { pipeline } from "node:stream/promises"
import { promisify } from "node:util"
import { crc32 } from "node:zlib"

import { decode } from "iconv-lite"
import yauzl, { Entry, ZipFile } from "yauzl"

import { buildStaticDockerImageSchema } from "@/schemas/buildStaticDockerImage"
import { dockerImageNameParser } from "@/schemas/dockerImageName"

import { createSharedFn } from "@/server/createSharedFn"
import { buildDockerImage } from "@/server/docker"
import { getReplaceDockerTemporaryName, inspectDockerImage, replaceDockerImage } from "@/server/dockerImage"
import { createDockerTempDirectory, deleteDockerTempDirectory } from "@/server/dockerTempDirectory"
import { writeTextToFile } from "@/server/writeTextToFile"
import { writeWebFileToPath } from "@/server/writeWebFileToPath"

import { ClientError } from "@/utils/clientError"

const execFileAsync = promisify(execFile)
const nodeRequire = createRequire(join(process.cwd(), "package.json"))

const nginxConfigContent = `worker_processes 1;

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
    extension: string
    outputDirectory: string
}

export interface ResolveDistDirectoryParams {
    extractDirectory: string
}

export interface OpenZipFileParams {
    path: string
}

export interface OpenZipReadStreamParams {
    entry: Entry
    zipFile: ZipFile
}

export interface ExtractZipEntryParams {
    entry: Entry
    outputDirectory: string
    zipFile: ZipFile
}

export interface ParseZipUnicodePathExtraFieldParams {
    entry: Entry
    rawFileName: Buffer
}

export interface ResolveZipEntryFileNameParams {
    entry: Entry
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
    skipFollowUp?: boolean
    skipMessage?: string
}

export interface ZipUnicodePathExtraField {
    crc32: number
    path: string
}

function get7zaPath() {
    if (process.env.USE_SYSTEM_7ZA === "true") return "7za"

    const packageJsonPath = nodeRequire.resolve("7zip-bin/package.json")
    const packageDirectory = dirname(packageJsonPath)

    if (process.platform === "win32") return join(packageDirectory, "win", process.arch, "7za.exe")
    if (process.platform === "darwin") return join(packageDirectory, "mac", process.arch, "7za")
    return join(packageDirectory, "linux", process.arch, "7za")
}

async function getExecutable7zaPath() {
    const path = get7zaPath()

    if (path === "7za" || process.platform === "win32") return path

    try {
        await chmod(path, 0o755)
    } catch {}

    return path
}

function getDockerfileContent(nginxImage: string) {
    return `FROM ${nginxImage}

WORKDIR /usr/share/nginx/html

RUN rm -rf ./*

COPY dist .

# 上传的压缩包可能保留了宿主机权限，统一放开只读权限，避免 nginx worker 无法读取静态文件
RUN chmod -R a+rX /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
`
}

function normalizeArchiveEntryPath(path: string) {
    return path.replace(/\\/gu, "/")
}

function getRawZipEntryFileName(entry: Entry) {
    const fileName = entry.fileName as unknown

    if (Buffer.isBuffer(fileName)) return fileName

    return Buffer.from(String(fileName))
}

function parseZipUnicodePathExtraField({ entry, rawFileName }: ParseZipUnicodePathExtraFieldParams) {
    const extraField = entry.extraFields.find(item => item.id === 0x7075)

    if (!extraField) return undefined
    if (extraField.data.length <= 5) return undefined

    const currentCrc32 = Number(crc32(rawFileName)) >>> 0
    const zipCrc32 = extraField.data.readUInt32LE(1) >>> 0

    if (currentCrc32 !== zipCrc32) return undefined

    return {
        crc32: zipCrc32,
        path: extraField.data.subarray(5).toString("utf8"),
    } as ZipUnicodePathExtraField
}

function isZipUtf8FileName(entry: Entry) {
    return (entry.generalPurposeBitFlag & 0x800) !== 0
}

function tryDecodeUtf8(buffer: Buffer) {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(buffer)
    } catch {
        return undefined
    }
}

function getDecodedFileNameScore(value: string) {
    const cjkCount = Array.from(value.matchAll(/[\u3400-\u9fff]/gu)).length
    const safeCount = Array.from(value.matchAll(/[a-zA-Z0-9/_\-.]/gu)).length
    const mojibakeCount = Array.from(value.matchAll(/[\u00c0-\u024f\u2500-\u259f\ufffd]/gu)).length
    const questionMarkCount = Array.from(value.matchAll(/\?/gu)).length

    return cjkCount * 4 + safeCount - mojibakeCount * 3 - questionMarkCount * 6
}

function decodeZipEntryFileName(rawFileName: Buffer) {
    const utf8Name = tryDecodeUtf8(rawFileName)
    const gb18030Name = decode(rawFileName, "gb18030")
    const cp437Name = decode(rawFileName, "cp437")
    const candidates = [utf8Name, gb18030Name, cp437Name].filter((item): item is string => !!item)

    if (candidates.length === 0) throw new ClientError("zip 文件名解码失败")

    return candidates.sort((first, second) => getDecodedFileNameScore(second) - getDecodedFileNameScore(first))[0]!
}

function resolveZipEntryFileName({ entry }: ResolveZipEntryFileNameParams) {
    const rawFileName = getRawZipEntryFileName(entry)
    const unicodePath = parseZipUnicodePathExtraField({
        entry,
        rawFileName,
    })?.path

    if (unicodePath) return normalizeArchiveEntryPath(unicodePath)
    if (isZipUtf8FileName(entry)) return normalizeArchiveEntryPath(rawFileName.toString("utf8"))

    return normalizeArchiveEntryPath(decodeZipEntryFileName(rawFileName))
}

function resolveArchiveEntryPath(outputDirectory: string, entryPath: string) {
    const normalizedEntryPath = normalizeArchiveEntryPath(entryPath).replace(/^\/+/u, "")
    const targetPath = resolve(outputDirectory, normalizedEntryPath)
    const relativePath = relative(outputDirectory, targetPath)

    if (!normalizedEntryPath) throw new ClientError("压缩包中存在空路径")
    if (relativePath.startsWith("..") || (resolve(outputDirectory) === targetPath && normalizedEntryPath !== ""))
        throw new ClientError(`压缩包中存在非法路径：${entryPath}`)

    return targetPath
}

function isDirectoryZipEntry(path: string) {
    return path.endsWith("/")
}

async function openZipFile({ path }: OpenZipFileParams) {
    return await new Promise<ZipFile>((resolve, reject) => {
        yauzl.open(
            path,
            {
                decodeStrings: false,
                lazyEntries: true,
                validateEntrySizes: true,
            },
            (error, zipFile) => {
                if (error || !zipFile) {
                    reject(error ?? new Error("打开 zip 文件失败"))
                    return
                }

                resolve(zipFile)
            },
        )
    })
}

async function openZipReadStream({ entry, zipFile }: OpenZipReadStreamParams) {
    return await new Promise<NodeJS.ReadableStream>((resolve, reject) => {
        zipFile.openReadStream(entry, (error, stream) => {
            if (error || !stream) {
                reject(error ?? new Error("读取 zip 文件内容失败"))
                return
            }

            resolve(stream)
        })
    })
}

async function extractZipEntry({ entry, outputDirectory, zipFile }: ExtractZipEntryParams) {
    const fileName = resolveZipEntryFileName({ entry })
    const targetPath = resolveArchiveEntryPath(outputDirectory, fileName)

    if (isDirectoryZipEntry(fileName)) {
        await mkdir(targetPath, { recursive: true })
        return
    }

    await mkdir(dirname(targetPath), { recursive: true })

    const readable = await openZipReadStream({ entry, zipFile })
    const writable = createWriteStream(targetPath)

    await pipeline(readable, writable)
}

async function extractZipArchive({ archivePath, outputDirectory }: ExtractArchiveParams) {
    const zipFile = await openZipFile({ path: archivePath })

    try {
        await mkdir(outputDirectory, { recursive: true })

        await new Promise<void>((resolve, reject) => {
            let settled = false

            function cleanup() {
                zipFile.removeListener("entry", onEntry)
                zipFile.removeListener("end", onEnd)
                zipFile.removeListener("error", onError)
            }

            function finish(error?: unknown) {
                if (settled) return

                settled = true
                cleanup()

                if (error) {
                    reject(error)
                    return
                }

                resolve()
            }

            function onEnd() {
                finish()
            }

            function onError(error: Error) {
                finish(error)
            }

            function onEntry(entry: Entry) {
                void (async function onReadEntry() {
                    try {
                        await extractZipEntry({
                            entry,
                            outputDirectory,
                            zipFile,
                        })

                        zipFile.readEntry()
                    } catch (error) {
                        finish(error)
                    }
                })()
            }

            zipFile.on("entry", onEntry)
            zipFile.on("end", onEnd)
            zipFile.on("error", onError)
            zipFile.readEntry()
        })
    } finally {
        zipFile.close()
    }
}

async function extract7zArchive({ archivePath, outputDirectory }: ExtractArchiveParams) {
    const sevenZipPath = await getExecutable7zaPath()

    await execFileAsync(sevenZipPath, ["x", archivePath, `-o${outputDirectory}`, "-y", "-bd", "-bb0"], {
        maxBuffer: 10 * 1024 * 1024,
        windowsHide: true,
    })
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

async function extractArchive({ archivePath, extension, outputDirectory }: ExtractArchiveParams) {
    try {
        if (extension === "zip") {
            await extractZipArchive({
                archivePath,
                extension,
                outputDirectory,
            })

            return
        }

        await extract7zArchive({
            archivePath,
            extension,
            outputDirectory,
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
        await extractArchive({
            archivePath,
            extension,
            outputDirectory: extractDirectory,
        })

        const sourceDirectory = await resolveDistDirectory({ extractDirectory })

        await prepareBuildContext({
            contextDirectory,
            nginxImage,
            sourceDirectory,
        })

        const output = await buildDockerImage({
            cwd: contextDirectory,
            name: imageName,
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
            skipFollowUp: replaceResult.skipFollowUp,
            skipMessage: replaceResult.skipMessage,
        } as BuildStaticDockerImageResult
    } finally {
        await deleteDockerTempDirectory(directory)
    }
})
