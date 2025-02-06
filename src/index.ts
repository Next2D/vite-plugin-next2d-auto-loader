import type { IConfigObject } from "./interface/IConfigObject";
import * as fs from "fs";

/**
 * @type {boolean}
 * @private
 */
const useTypeScript: boolean = fs.existsSync(`${process.cwd()}/src/index.ts`);

/**
 * @type {string}
 * @private
 */
const ext: "ts" | "js" = useTypeScript ? "ts" : "js";

/**
 * @type {string}
 * @private
 */
let $cacheConfig: string = "";

/**
 * @typem {string}
 * @private
 */
let $cachePackages: string = "";

/**
 * @type {string}
 * @private
 */
const EOL: string = "\n";

/**
 * @return {object}
 * @method
 * @public
 */
export default function autoLoader (): any
{
    /**
     * @description 指定されたパスのファイルタイプを返却します。
     *              Returns the file type of the specified path.
     *
     * @param  {string} path
     * @return {string}
     * @method
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

        } catch (_) {

            return "unknown";

        }
    };

    /**
     * @description 指定されたディレクトリパス内のファイルパスリストを返却します。
     *              Returns a list of file paths in the specified directory path.
     *
     * @param  {string} dir_path
     * @return {string[]}
     * @method
     */
    const getFilePathList = (dir_path: string): string[] =>
    {
        const files: string[] = [];
        const paths: string[] = fs.readdirSync(dir_path);

        for (let idx = 0; idx < paths.length; ++idx) {

            const path = `${dir_path}/${paths[idx]}`;
            switch (getFileType(path)) {

                case "file":
                    files.push(path);
                    break;

                case "directory":
                    files.push(...getFilePathList(path));
                    break;

                default:
                    break;

            }
        }

        return files;
    };

    /**
     * @description config ディレクトリのjsonファイルを読み込み、Config.[ts|js]を生成します。
     *              Reads JSON files from the config directory and generates Config.[ts|js].
     *
     * @return {void}
     * @method
     */
    const buildConfig = (): void =>
    {
        const configDir   = `${process.cwd()}/src/config`;
        const environment = process.env.NEXT2D_EBUILD_ENVIRONMENT || "local";
        const platform    = process.env.NEXT2D_TARGET_PLATFORM || "web";

        const config: IConfigObject = {
            "platform": platform,
            "stage"  : {},
            "routing": {}
        };

        // load config.json
        const configPath = `${configDir}/config.json`;
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
        const stagePath = `${configDir}/stage.json`;
        if (fs.existsSync(stagePath)) {
            Object.assign(
                config.stage,
                JSON.parse(fs.readFileSync(stagePath, { "encoding": "utf8" }))
            );
        }

        // load routing.json
        const routingPath = `${configDir}/routing.json`;
        if (fs.existsSync(routingPath)) {
            Object.assign(
                config.routing,
                JSON.parse(fs.readFileSync(routingPath, { "encoding": "utf8" }))
            );
        }

        const regexp: RegExp = new RegExp(/{{(.*?)}}/, "g");

        let configString = JSON.stringify(config, null, 4);
        const values: RegExpMatchArray | null = configString.match(regexp);
        if (values) {
            for (let idx = 0; idx < values.length; ++idx) {

                const value = values[idx];

                const names = value
                    .replace(/\{|\{|\}|\}/g, "")
                    .replace(/\s+/g, "")
                    .split(".");

                if (!names.length) {
                    continue;
                }

                let configValue: any = config;
                for (let idx = 0; idx < names.length; ++idx) {
                    const name = names[idx];
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

        if ($cacheConfig !== configString) {

            // cache update
            $cacheConfig = configString;

            const source = `const config = ${configString};
export { config };`;

            fs.writeFileSync(`${configDir}/Config.${ext}`, source);
        }
    };

    /**
     * @description view、 model ディレクトリ配下のファイルを読み込み、Package.[ts|js]を生成します。
     *              Reads files under the view and model directories and generates Package.[ts|js].
     *
     * @return {void}
     * @method
     */
    const buildPackage = (): void =>
    {
        const dir   = process.cwd();
        const filePaths = getFilePathList(`${dir}/src`);

        let imports  = "";
        let packages = `[${EOL}`;
        for (let idx = 0; idx < filePaths.length; ++idx) {

            const filePath = filePaths[idx];

            // ts, js 以外はスキップ
            if (filePath.indexOf(`.${ext}`) === -1) {
                continue;
            }

            const js = fs.readFileSync(filePath, { "encoding": "utf-8" });
            const lines = js.split("\n");

            const path = filePath.replace(`${dir}/`, "");
            for (let idx = 0; idx < lines.length; ++idx) {

                const line = lines[idx];

                // クラス定義以外はスキップ
                if (line.indexOf("export class ") === -1) {
                    continue;
                }

                const name = line.split(" ")[2];
                switch (true) {

                    case path.indexOf("src/view/") > -1:
                        imports  += `import { ${name} } from "@/${path.split("src/")[1].split(`.${ext}`)[0]}";${EOL}`;
                        packages += `    ["${name}", ${name}],${EOL}`;
                        break;

                    case path.indexOf("src/model/") > -1:
                        {
                            const key = filePath
                                .split("src/model/")[1]
                                .split("/")
                                .join(".")
                                .slice(0, -3);

                            const asName = filePath
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

        let source = `${imports}${EOL}`;
        source += ext === "ts"
            ? `const packages: Array<Array<string | Function>> = ${packages};${EOL}`
            : `const packages = ${packages};${EOL}`;
        source += "export { packages };";

        if ($cachePackages !== source) {
            $cachePackages = source;
            fs.writeFileSync(`${dir}/src/Packages.${ext}`, source);
        }
    };

    return {
        "name": "vite-plugin-next2d-auto-loader",
        "buildStart": {
            "order": "pre",
            handler() {
                buildConfig();
                buildPackage();
            }
        },
        configureServer (server: any): void
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