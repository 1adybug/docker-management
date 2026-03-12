import { join } from "node:path"

import { execAsync } from "soda-nodejs"

import { uploadDockerImageSchema } from "@/schemas/uploadDockerImage"

import { createSharedFn } from "@/server/createSharedFn"
import { createDockerTempDirectory, deleteDockerTempDirectory } from "@/server/dockerTempDirectory"
import { isAdmin } from "@/server/isAdmin"
import { writeWebFileToPath } from "@/server/writeWebFileToPath"

import { ClientError } from "@/utils/clientError"

export interface UploadDockerImageResult {
    /** docker load 的输出 */
    output: string
}

function getUploadFile(formData: FormData) {
    const file = formData.get("file")

    if (!(file instanceof File)) throw new ClientError("请先选择 tar 文件")

    if (file.size <= 0) throw new ClientError("上传的 tar 文件不能为空")

    if (!file.name.toLowerCase().endsWith(".tar")) throw new ClientError("仅支持上传 tar 文件")

    return file
}

export const uploadDockerImage = createSharedFn<FormData>({
    name: "uploadDockerImage",
    schema: uploadDockerImageSchema,
    filter: isAdmin,
})(async function uploadDockerImage(formData) {
    const file = getUploadFile(formData)
    const directory = await createDockerTempDirectory({
        prefix: "docker-management-image-",
    })
    const path = join(directory, "image.tar")

    try {
        await writeWebFileToPath({ file, path })

        const output = await execAsync(`docker load -i "${path}"`)

        return {
            output,
        } as UploadDockerImageResult
    } finally {
        await deleteDockerTempDirectory(directory)
    }
})
