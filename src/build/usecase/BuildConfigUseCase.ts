import type { IConfigObject } from "../../interface/IConfigObject";
import * as fs from "fs";

/**
 * @type {string}
 * @private
 */
let $cacheConfig: string = "";

/**
 * @description config ディレクトリのjsonファイルを読み込み、Config.[ts|js]を生成します。
 *              Reads JSON files from the config directory and generates Config.[ts|js].
 *
 * @param  {string} ext
 * @return {void}
 * @method
 * @protected 
 */
export const execute = (ext: "ts" | "js"): void =>
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