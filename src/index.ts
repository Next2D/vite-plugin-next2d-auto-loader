import type { ConfigObjectImpl } from "./interface/ConfigObjectImpl";
import type { ObjectImpl } from "./interface/ObjectImpl";
import fs from "fs";
import os from "os";

/**
 * @type {string}
 * @private
 */
let cacheConfig: string = "";

/**
 * @param  {object} object
 * @return {void}
 * @method
 * @private
 */
const buildConfig = (object: ObjectImpl): void =>
{
    const configDir: string = `${process.cwd()}/src/config`;

    const config: ConfigObjectImpl = {
        "platform": object.platform,
        "stage"  : {},
        "routing": {}
    };

    // load config.json
    const configPath: string = `${configDir}/config.json`;
    if (fs.existsSync(configPath)) {

        const configObject: any = JSON.parse(
            fs.readFileSync(configPath, { "encoding": "utf8" })
        );

        if (object.environment in configObject) {
            Object.assign(config, configObject[object.environment]);
        }

        if (configObject.all) {
            Object.assign(config, configObject.all);
        }
    }

    // load stage.json
    const stagePath: string = `${configDir}/stage.json`;
    if (fs.existsSync(stagePath)) {
        Object.assign(
            config.stage,
            JSON.parse(fs.readFileSync(stagePath, { "encoding": "utf8" }))
        );
    }

    // load routing.json
    const routingPath: string = `${configDir}/routing.json`;
    if (fs.existsSync(routingPath)) {
        Object.assign(
            config.routing,
            JSON.parse(fs.readFileSync(routingPath, { "encoding": "utf8" }))
        );
    }

    const configString: string = JSON.stringify(config, null, 4);
    if (cacheConfig !== configString) {

        // cache update
        cacheConfig = configString;

        fs.writeFileSync(
            `${configDir}/Config.ts`,
            `import type { ConfigImpl } from "@next2d/framework";
const config: ConfigImpl = ${configString};
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
const getFileType = (path: string): string =>
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
const getListFiles = (dir_path: string): string[] =>
{
    const files: string[] = [];
    const paths: string[] = fs.readdirSync(dir_path);

    for (let idx: number = 0; idx < paths.length; ++idx) {

        const path: string = `${dir_path}/${paths[idx]}`;
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
 * @typem {string}
 * @private
 */
let cachePackages: string = "";

/**
 * @return {void}
 * @method
 * @private
 */
const buildPackage = (): void =>
{
    const dir: string     = process.cwd();
    const files: string[] = getListFiles(`${dir}/src`);

    let imports: string  = "";
    let packages: string = `[${os.EOL}`;
    for (let idx: number = 0; idx < files.length; ++idx) {

        const file: string = files[idx];
        if (file.indexOf(".ts") === -1) {
            continue;
        }

        const js: string = fs.readFileSync(file, { "encoding": "utf-8" });
        const lines: string[] = js.split("\n");

        const path: string = file.replace(`${dir}/`, "");
        for (let idx: number = 0; idx < lines.length; ++idx) {

            const line: string = lines[idx];
            if (line.indexOf("export class ") === -1) {
                continue;
            }

            const name: string = line.split(" ")[2];
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

    const packageString: string = `${imports}
const packages: any[] = ${packages};
export { packages };`;

    if (cachePackages !== packageString) {
        cachePackages = packageString;
        fs.writeFileSync(`${dir}/src/Packages.ts`, packageString);
    }
};

/**
 * @param  {object} object
 * @return {object}
 * @method
 * @public
 */
export default function autoLoader (object: ObjectImpl): any
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
        configureServer (server: any)
        {
            const dir: string = `${process.cwd()}/src/config`;
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
}