// @ts-check

import { execFileSync, spawnSync } from "node:child_process"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { name } = require("../package.json")

const platforms = ["linux/amd64", "linux/arm64"]

const date = new Date()
const dateTag = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("")
const commitTag = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim().slice(0, 8)
const image = ["luzixu", name].join("/")
const images = ["latest", dateTag, commitTag].map(tag => `${image}:${tag}`)

/**
 * @param {string[]} args
 */
function run(args) {
    const result = spawnSync("docker", args, { stdio: "inherit" })

    if (result.status !== 0) process.exit(result.status ?? 1)
}

run(["buildx", "build", "--platform", platforms.join(","), ...images.flatMap(image => ["-t", image]), "--push", "."])
