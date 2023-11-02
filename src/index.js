"use strict";

const fs = require("fs");
const os = require("os");

/**
 * @type {object}
 * @private
 */
let cacheConfig = null;

/**
 * @param  {{"platform": string, "environment": string}} object
 * @return {void}
 * @method
 * @private
 */
const buildConfig = (object) =>
{
    const configDir = `${process.cwd()}/src/config`;

    const config = {
        "platform": object.platform,
        "stage"  : {},
        "routing": {}
    };

    // load config.json
    const configPath = `${configDir}/config.json`;
    if (fs.existsSync(configPath)) {

        const envJson = JSON.parse(
            fs.readFileSync(configPath, { "encoding": "utf8" })
        );

        if (object.environment in envJson) {
            Object.assign(config, envJson[object.environment]);
        }

        if (envJson.all) {
            Object.assign(config, envJson.all);
        }
    }

    // load stage.json
    const stagePath = `${configDir}/stage.json`;
    if (fs.existsSync(stagePath)) {

        const stageJson = JSON.parse(
            fs.readFileSync(stagePath, { "encoding": "utf8" })
        );

        Object.assign(config.stage, stageJson);
    }

    // load routing.json
    const routingPath = `${configDir}/routing.json`;
    if (fs.existsSync(routingPath)) {

        const routingJson = JSON.parse(
            fs.readFileSync(routingPath, { "encoding": "utf8" })
        );

        Object.assign(config.routing, routingJson);
    }

    const json = JSON.stringify(config, null, 4);
    if (cacheConfig !== json) {
        // cache
        cacheConfig = json;

        fs.writeFileSync(
            `${configDir}/Config.ts`,
            `import type { ConfigImpl } from "@next2d/framework";
const config: ConfigImpl = ${JSON.stringify(config, null, 4)};
export { config };`
        );
    }
};

/**
 * @param  {string} path
 * @return {string}
 * @method
 * @private
 */
const getFileType = (path) =>
{
    try {

        const stat = fs.statSync(path);

        switch (true) {
            case stat.isFile():
                return "file";

            case stat.isDirectory():
                return "directory";

            default:
                return "unknown";
        }

    } catch (e) {

        return "unknown";

    }
};

/**
 * @param  {string} dir_path
 * @return {array}
 * @method
 * @private
 */
const getListFiles = (dir_path) =>
{
    const files = [];
    const paths = fs.readdirSync(dir_path);

    for (let idx = 0; idx < paths.length; ++idx) {

        const path = `${dir_path}/${paths[idx]}`;
        switch (getFileType(path)) {

            case "file":
                files.push(path);
                break;

            case "directory":
                files.push(...getListFiles(path));
                break;

            default:
                break;

        }
    }

    return files;
};

/**
 * @typem {object}
 * @private
 */
let cachePackages = null;

/**
 * @return {void}
 * @method
 * @private
 */
const buildPackage = () =>
{
    const dir   = process.cwd();
    const files = getListFiles(`${dir}/src`);

    let imports  = "";
    let packages = `[${os.EOL}`;
    for (let idx = 0; idx < files.length; ++idx) {

        const file = files[idx];
        if (file.indexOf(".ts") === -1) {
            continue;
        }

        const js    = fs.readFileSync(file, { "encoding": "utf-8" });
        const lines = js.split("\n");

        const path = file.replace(`${dir}/`, "");
        for (let idx = 0; idx < lines.length; ++idx) {

            const line = lines[idx];
            if (line.indexOf("export class ") === -1) {
                continue;
            }

            const name = line.split(" ")[2];
            switch (true) {

                case path.indexOf("src/view/") > -1:
                    imports  += `import { ${name} } from "@/${path.split("src/")[1].split(".ts")[0]}";${os.EOL}`;
                    packages += `    ["${name}", ${name}],${os.EOL}`;
                    break;

                case path.indexOf("src/model/") > -1:
                    {
                        const key = file
                            .split("src/model/")[1]
                            .split("/")
                            .join(".")
                            .slice(0, -3);

                        const asName = file
                            .split("src/model/")[1]
                            .split("/")
                            .join("_")
                            .slice(0, -3);

                        imports  += `import { ${name} as ${asName} } from "@/${path.split("src/")[1].split(".ts")[0]}";${os.EOL}`;
                        packages += `    ["${key}", ${asName}],${os.EOL}`;
                    }
                    break;

                default:
                    break;

            }

            break;

        }
    }

    packages  = packages.slice(0, -2);
    packages += `${os.EOL}]`;

    const value = `${imports}
const packages: any[] = ${packages};
export { packages };`;

    if (cachePackages !== value) {
        cachePackages = value;
        fs.writeFileSync(`${dir}/src/Packages.ts`, value);
    }
};

/**
 * @param {object} object
 * @returns
 */
export default function autoLoader (object)
{
    return {
        "name": "vite-typescript-auto-loader-plugin",
        "buildStart": {
            "order": "pre",
            handler() {
                buildConfig(object);
                buildPackage();
            }
        },
        configureServer (server)
        {
            const dir = `${process.cwd()}/src/config`;
            server.watcher.add([
                `${dir}/config.json`,
                `${dir}/routing.json`,
                `${dir}/stage.json`
            ]);

            server.watcher.on("change", () =>
            {
                buildConfig(object);
            });
        }
    };
};