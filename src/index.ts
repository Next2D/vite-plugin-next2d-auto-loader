import type { IConfigObject } from "./interface/IConfigObject";
import * as fs from "fs";

const useTypeScript: boolean = fs.existsSync(`${process.cwd()}/src/index.ts`);
const ext: string = useTypeScript ? "ts" : "js";

/**
 * @type {string}
 * @private
 */
let cacheConfig: string = "";

/**
 * @return {void}
 * @method
 * @private
 */
const buildConfig = (): void =>
{
    const configDir: string   = `${process.cwd()}/src/config`;
    const environment: string = process.env.NEXT2D_EBUILD_ENVIRONMENT || "local";
    const platform: string    = process.env.NEXT2D_TARGET_PLATFORM || "web";

    const config: IConfigObject = {
        "platform": platform,
        "stage"  : {},
        "routing": {}
    };

    // load config.json
    const configPath: string = `${configDir}/config.json`;
    if (fs.existsSync(configPath)) {

        const configObject: any = JSON.parse(
            fs.readFileSync(configPath, { "encoding": "utf8" })
        );

        if (environment in configObject) {
            Object.assign(config, configObject[environment]);
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

    const regexp: RegExp = new RegExp(/{{(.*?)}}/, "g");

    let configString: string = JSON.stringify(config, null, 4);
    const values: RegExpMatchArray | null = configString.match(regexp);
    if (values) {
        for (let idx: number = 0; idx < values.length; ++idx) {

            const value: string = values[idx];

            const names: string[] = value
                .replace(/\{|\{|\}|\}/g, "")
                .replace(/\s+/g, "")
                .split(".");

            if (!names.length) {
                continue;
            }

            let configValue: any = config;
            for (let idx: number = 0; idx < names.length; ++idx) {
                const name: string = names[idx];
                if (name in configValue) {
                    configValue = configValue[name];
                }
            }

            if (config === configValue) {
                continue;
            }

            configString = configString.replace(value, configValue);
        }
    }

    if (cacheConfig !== configString) {

        // cache update
        cacheConfig = configString;

        let source: string = "";
        if (useTypeScript) {
            source += `import type { IConfig } from "@next2d/framework";
const config: IConfig = ${configString};
export { config };`;
        } else {
            source += `const config = ${configString};
export { config };`;
        }

        fs.writeFileSync(`${configDir}/Config.${ext}`, source);
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
 * @type {string}
 * @private
 */
const EOL: string = "\n";

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
    let packages: string = `[${EOL}`;
    for (let idx: number = 0; idx < files.length; ++idx) {

        const file: string = files[idx];
        if (file.indexOf(`.${ext}`) === -1) {
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
                    imports  += `import { ${name} } from "@/${path.split("src/")[1].split(`.${ext}`)[0]}";${EOL}`;
                    packages += `    ["${name}", ${name}],${EOL}`;
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

                        imports  += `import { ${name} as ${asName} } from "@/${path.split("src/")[1].split(`.${ext}`)[0]}";${EOL}`;
                        packages += `    ["${key}", ${asName}],${EOL}`;
                    }
                    break;

                default:
                    break;

            }

            break;

        }
    }

    packages  = packages.slice(0, -2);
    packages += `${EOL}]`;

    let source: string = "";
    if (useTypeScript) {
        source = `${imports}
const packages: Array<Array<string | Function>> = ${packages};
export { packages };`;
    } else {
        source = `${imports}
const packages = ${packages};
export { packages };`;
    }

    if (cachePackages !== source) {
        cachePackages = source;
        fs.writeFileSync(`${dir}/src/Packages.${ext}`, source);
    }
};

/**
 * @return {object}
 * @method
 * @public
 */
export default function autoLoader (): any
{
    return {
        "name": "vite-typescript-auto-loader-plugin",
        "buildStart": {
            "order": "pre",
            handler() {
                buildConfig();
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
                buildConfig();
            });
        }
    };
}