// @ts-check

/** @type {import("prettier").Config} */
const config = {
    trailingComma: "none",
    tabWidth: 4,
    overrides: [
        {
            files: "package-lock.json",
            options: {
                requirePragma: true
            }
        }
    ]
};

export default config;
