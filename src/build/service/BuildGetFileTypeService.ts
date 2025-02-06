import * as fs from "fs";

/**
 * @description 指定されたパスのファイルタイプを返却します。
 *              Returns the file type of the specified path.
 *
 * @param  {string} path
 * @return {string}
 */
export const execute = (path: string): string =>
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