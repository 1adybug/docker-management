// @ts-check

/** @type {import("postcss-load-config").Config} */
const config = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
        "css-has-pseudo": {
            preserve: true,
        },
    },
}

export default config
