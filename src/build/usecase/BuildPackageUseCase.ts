import * as fs from "fs";
import { execute as buildGetFilePathListUseCase } from "./BuildGetFilePathListUseCase";

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
 * @description view、 model ディレクトリ配下のファイルを読み込み、Package.[ts|js]を生成します。
 *              Reads files under the view and model directories and generates Package.[ts|js].
 * 
 * @param  {string} ext
 * @return {void}
 * @method
 * @protected
 */
export const execute = (ext: "ts" | "js"): void =>
{
    const dir   = process.cwd();
    const files = buildGetFilePathListUseCase(`${dir}/src`);

    let imports  = "";
    let packages = `[${EOL}`;
    for (let idx = 0; idx < files.length; ++idx) {

        const file = files[idx];

        // ts, js 以外はスキップ
        if (file.indexOf(`.${ext}`) === -1) {
            continue;
        }

        const js = fs.readFileSync(file, { "encoding": "utf-8" });
        const lines = js.split("\n");

        const path = file.replace(`${dir}/`, "");
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

    let source = `${imports}${EOL}`;
    source += ext === "ts" 
        ? `const packages: Array<Array<string | Function>> = ${packages};${EOL}`
        : `const packages = ${packages};${EOL}`;
    source += "export { packages };"

    if ($cachePackages !== source) {
        $cachePackages = source;
        fs.writeFileSync(`${dir}/src/Packages.${ext}`, source);
    }
};