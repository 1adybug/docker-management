import { type WorkBook, read, utils, write } from "@1adybug/xlsx"

import { type AddUserParams, addUserParser } from "@/schemas/addUser"
import { UserRole } from "@/schemas/userRole"

import { ClientError } from "@/utils/clientError"
import { formatDateTime } from "@/utils/formatDateTime"

const UserImportHeader = {
    name: "用户名",
    nickname: "昵称",
    phoneNumber: "手机号",
    role: "角色",
    status: "导入状态",
} as const

const UserExportHeader = {
    id: "用户 ID",
    name: "用户名",
    nickname: "昵称",
    phoneNumber: "手机号",
    role: "角色",
    banned: "状态",
    banReason: "封禁原因",
    banExpires: "封禁时间",
    createdAt: "创建时间",
    updatedAt: "更新时间",
} as const

export interface UserWorkbookData {
    id: string
    name: string
    nickname: string
    phoneNumber: string
    role: UserRole
    banned?: boolean | null
    banReason?: string | null
    banExpires?: Date | null
    createdAt: Date
    updatedAt: Date
}

export interface UserImportWorkbookRowData {
    name: string
    nickname: string
    phoneNumber: string
    role: string
}

export interface UserImportWorkbookRow {
    rowNumber: number
    data: UserImportWorkbookRowData
    params?: AddUserParams
    errorMessage?: string
}

export interface UserImportWorkbookResultRow {
    data: UserImportWorkbookRowData
    status: string
}

interface CreateWorkbookParams {
    rows: Record<string, unknown>[]
    sheetName: string
    columnWidths: number[]
}

function getCellText(value: unknown) {
    if (value === undefined || value === null) return ""
    if (value instanceof Date) return formatDateTime(value)
    return String(value).trim()
}

function getUserRoleLabel(role: UserRole) {
    if (role === UserRole.管理员) return "管理员"
    return "用户"
}

function getUserRoleValue(value: unknown) {
    const text = getCellText(value)
    if (!text) return UserRole.用户
    if (text === "管理员" || text === UserRole.管理员) return UserRole.管理员
    if (text === "用户" || text === UserRole.用户) return UserRole.用户
    throw new ClientError("角色只能填写“管理员”或“用户”")
}

function createWorkbook({ rows, sheetName, columnWidths }: CreateWorkbookParams) {
    const workbook = utils.book_new()
    const worksheet = utils.json_to_sheet(rows)
    worksheet["!cols"] = columnWidths.map(wch => ({ wch }))

    utils.book_append_sheet(workbook, worksheet, sheetName)

    return writeWorkbook(workbook)
}

function writeWorkbook(workbook: WorkBook) {
    return write(workbook, {
        type: "buffer",
        bookType: "xlsx",
        compression: true,
    }) as Uint8Array
}

function getWorksheetCellText(worksheet: WorkBook["Sheets"][string], row: number, column: number) {
    const cell = worksheet[utils.encode_cell({ r: row, c: column })]
    return getCellText(cell?.w ?? cell?.v)
}

function getHeaderColumnMap(worksheet: WorkBook["Sheets"][string]) {
    const rangeText = worksheet["!ref"]
    if (!rangeText) throw new ClientError("xlsx 文件没有用户数据")

    const range = utils.decode_range(rangeText)
    const columnMap = new Map<string, number>()

    for (let column = range.s.c; column <= range.e.c; column++) {
        const header = getWorksheetCellText(worksheet, range.s.r, column)
        if (header) columnMap.set(header, column)
    }

    return { range, columnMap, headerRow: range.s.r }
}

function getRequiredColumn(columnMap: Map<string, number>, header: string) {
    const column = columnMap.get(header)
    if (column === undefined) throw new ClientError(`导入文件缺少列：${header}`)
    return column
}

function isBlankUserImportRow(data: UserImportWorkbookRowData) {
    return !data.name && !data.nickname && !data.phoneNumber
}

function parseUserImportRow(data: UserImportWorkbookRowData) {
    try {
        return addUserParser({
            name: data.name,
            nickname: data.nickname,
            phoneNumber: data.phoneNumber,
            role: getUserRoleValue(data.role),
        })
    } catch (error) {
        const message = error instanceof Error ? error.message : "用户数据无效"
        throw new ClientError(message)
    }
}

export function createUserImportTemplateWorkbook() {
    return createWorkbook({
        sheetName: "用户导入模板",
        columnWidths: [18, 18, 18, 12],
        rows: [
            {
                [UserImportHeader.name]: "",
                [UserImportHeader.nickname]: "",
                [UserImportHeader.phoneNumber]: "",
                [UserImportHeader.role]: "用户",
            },
        ],
    })
}

export function createUserExportWorkbook(data: UserWorkbookData[]) {
    return createWorkbook({
        sheetName: "用户列表",
        columnWidths: [34, 18, 18, 18, 12, 12, 24, 20, 20, 20],
        rows: data.map(user => ({
            [UserExportHeader.id]: user.id,
            [UserExportHeader.name]: user.name,
            [UserExportHeader.nickname]: user.nickname,
            [UserExportHeader.phoneNumber]: user.phoneNumber,
            [UserExportHeader.role]: getUserRoleLabel(user.role),
            [UserExportHeader.banned]: user.banned ? "已封禁" : "正常",
            [UserExportHeader.banReason]: user.banReason ?? "",
            [UserExportHeader.banExpires]: user.banExpires ? formatDateTime(user.banExpires) : user.banned ? "永久" : "未封禁",
            [UserExportHeader.createdAt]: formatDateTime(user.createdAt),
            [UserExportHeader.updatedAt]: formatDateTime(user.updatedAt),
        })),
    })
}

export function createUserImportResultWorkbook(rows: UserImportWorkbookResultRow[]) {
    return createWorkbook({
        sheetName: "用户导入结果",
        columnWidths: [18, 18, 18, 12, 36],
        rows: rows.map(row => ({
            [UserImportHeader.name]: row.data.name,
            [UserImportHeader.nickname]: row.data.nickname,
            [UserImportHeader.phoneNumber]: row.data.phoneNumber,
            [UserImportHeader.role]: row.data.role || "用户",
            [UserImportHeader.status]: row.status,
        })),
    })
}

export function parseUserImportWorkbook(buffer: Uint8Array): UserImportWorkbookRow[] {
    const workbook = read(buffer, { type: "buffer", raw: false })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new ClientError("xlsx 文件没有工作表")

    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) throw new ClientError("xlsx 文件没有工作表")

    const { range, columnMap, headerRow } = getHeaderColumnMap(worksheet)
    const nameColumn = getRequiredColumn(columnMap, UserImportHeader.name)
    const nicknameColumn = getRequiredColumn(columnMap, UserImportHeader.nickname)
    const phoneNumberColumn = getRequiredColumn(columnMap, UserImportHeader.phoneNumber)
    const roleColumn = getRequiredColumn(columnMap, UserImportHeader.role)

    const rows: UserImportWorkbookRow[] = []

    for (let row = headerRow + 1; row <= range.e.r; row++) {
        const data = {
            name: getWorksheetCellText(worksheet, row, nameColumn),
            nickname: getWorksheetCellText(worksheet, row, nicknameColumn),
            phoneNumber: getWorksheetCellText(worksheet, row, phoneNumberColumn),
            role: getWorksheetCellText(worksheet, row, roleColumn),
        }

        if (isBlankUserImportRow(data)) continue

        const rowNumber = row + 1

        try {
            rows.push({
                rowNumber,
                data,
                params: parseUserImportRow(data),
            })
        } catch (error) {
            rows.push({
                rowNumber,
                data,
                errorMessage: error instanceof Error ? error.message : "用户数据无效",
            })
        }
    }

    return rows
}
