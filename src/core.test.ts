
import path from "path";
import fs from "fs/promises"
import { load } from "./core";

async function betterReadDir(dir: string, ext?: string): Promise<string[]> {
    let files = await fs.readdir(dir);
    files = ext ? files.filter(f => path.extname(f) === ext) : files;
    return files.map(file => path.join(dir, file));
}

describe("plugin", () => {
    it("works", async () => {
        const files = [
            ...await betterReadDir("./test/tilesets", ".xml"),
            ...await betterReadDir("./test/maps", ".xml"),
        ];

        const results = [];
        for (const file of files) {
            results.push(
                [file, await load({ filePath: file })]
            );
        }

        /* console.log(results); */
    });
});