import * as fs from "fs";
import { execute as buildConfigUseCase } from "./build/usecase/BuildConfigUseCase";
import { execute as buildPackageUseCase } from "./build/usecase/BuildPackageUseCase";

console.log(process.cwd());
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
 * @return {object}
 * @method
 * @public
 */
export default function autoLoader (): any
{
    return {
        "name": "vite-plugin-next2d-auto-loader",
        "buildStart": {
            "order": "pre",
            handler() {
                buildConfigUseCase(ext);
                buildPackageUseCase(ext);
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
                buildConfigUseCase(ext);
            });
        }
    };
}