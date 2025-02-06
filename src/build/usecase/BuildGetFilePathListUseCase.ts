import * as fs from "fs";
import { execute as buildGetFileTypeService } from "../service/BuildGetFileTypeService";

/**
 * @description 指定されたディレクトリパス内のファイルパスリストを返却します。
 *              Returns a list of file paths in the specified directory path.
 *
 * @param  {string} dir_path
 * @return {string[]}
 * @method
 * @protected
 */
export const execute = (dir_path: string): string[] =>
{
    const files: string[] = [];
    const paths: string[] = fs.readdirSync(dir_path);

    for (let idx = 0; idx < paths.length; ++idx) {

        const path = `${dir_path}/${paths[idx]}`;
        switch (buildGetFileTypeService(path)) {

            case "file":
                files.push(path);
                break;

            case "directory":
                files.push(...execute(path));
                break;

            default:
                break;

        }
    }

    return files;
};