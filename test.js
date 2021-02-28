
const path = require("path");
const fs = require("fs").promises;
const plugin = require("./plugin");

/**
 * 
 * @param {string} dir 
 * @param {string|undefined} ext
 * @returns {Promise<string>}
 */
async function betterReadDir(dir, ext) {
    let files = await fs.readdir(dir);
    files = ext ? files.filter(f => path.extname(f) === ext) : files;
    return files.map(file => path.join(dir, file));
}

(async () => {
    const pluginInstance = plugin();

    const files = [
        ...await betterReadDir("./test/tilesets", ".xml"),
        ...await betterReadDir("./test/maps", ".xml"),
    ];

    console.log(files);

    const results = [];
    for (const file of files) {
        results.push(
            [file, await pluginInstance.load({ filePath: file })]
        );
    }

    console.log(results);
})();