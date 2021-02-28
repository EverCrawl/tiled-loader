
import path from "path";
import fs from "fs"
import { loadSync } from "./core";

function betterReadDir(dir: string, ext?: string): string[] {
    let files = fs.readdirSync(dir);
    files = ext ? files.filter(f => path.extname(f) === ext) : files;
    return files.map(file => path.join(dir, file));
}

describe("plugin", () => {
    it("works", async () => {
        const files = [
            ...betterReadDir("./test/tilesets", ".xml"),
            ...betterReadDir("./test/maps", ".xml"),
        ];

        const results = [];
        for (const file of files) {
            results.push([file, loadSync({ filePath: file })])
        }

        /* console.log(results); */
    });
});