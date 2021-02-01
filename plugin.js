
// TODO: move to a git repository

const fs = require("fs").promises;
const DOM = require("jsdom").JSDOM;

/** @param {Document} document */
function isTilemapXML(document) {
    // document root must have a "map" element with a "tiledversion" property
    for (let i = 0; i < document.children.length; ++i) {
        const el = document.children.item(i);
        if (el.tagName === "map" && el.attributes.getNamedItem("tiledversion") != null) {
            return true;
        }
    }
    return false;
}

/** @param {Document} document */
function isTilesetXML(document) {
    // document root must have a "tileset" element with a "tiledversion" property
    for (let i = 0; i < document.children.length; ++i) {
        const el = document.children.item(i);
        if (el.tagName === "tileset" && el.attributes.getNamedItem("tiledversion") != null) {
            return true;
        }
    }
    return false;
}

/** @type {import("snowpack").SnowpackPluginFactory} */
module.exports = function (cfg, opt = {}) {
    return {
        name: "snowpack-plugin-tiled",
        resolve: {
            input: [".xml"],
            output: [".tmap", ".tset"]
        },
        async load({ filePath }) {
            const file = await fs.readFile(filePath, "utf-8");
            const xml = new DOM(file);
            
            if (isTilemapXML(xml.window.document)) {
                // TODO transform tilemap
                return {
                    ".tmap": file
                }
            }
            else if (isTilesetXML(xml.window.document)) {
                // TODO transform tileset
                return {
                    ".tset": file
                }
            }
            // otherwise output nothing
        }
    }
}