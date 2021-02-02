
// TODO: change to .ts
// TODO: include a build step
// TODO: setup build in `prepare` script
// TODO: make some tests + setup auto testing

const fs = require("fs").promises;
const path = require("path");
const { JSDOM } = require("jsdom");
const DOM = new JSDOM("");
const DOMParser = DOM.window.DOMParser;
const xmlParser = new DOMParser;

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;
const TILE_ID_BIT_N = 0;
const TILESET_ID_BIT_N = 10;

const CollisionKind = Object.freeze({
    0: "None",
    1: "Full",
    2: "SlopeLeft",
    3: "SlopeRight",
    4: "SlopeLeftBottom",
    5: "SlopeRightBottom",
    6: "SlopeLeftTop",
    7: "SlopeRightTop",
    "None": 0,
    "Full": 1,
    "SlopeLeft": 2,
    "SlopeRight": 3,
    "SlopeLeftBottom": 4,
    "SlopeRightBottom": 5,
    "SlopeLeftTop": 6,
    "SlopeRightTop": 7,
})

/** @param {Element} document */
function isTilemapXML(document) {
    // document root must have a "map" element with a "tiledversion" property
    for (let i = 0; i < document.children.length; ++i) {
        const el = document.children[i];
        if (el.tagName === "map" && el.attributes.getNamedItem("tiledversion") != null) {
            return true;
        }
    }
    return false;
}

async function loadTileset(filePath) {
    return transformTileset(filePath, 
        xmlParser.parseFromString(
            await fs.readFile(filePath, "utf-8"), 
            "text/xml"));

}

/** 
 * @param {Element} el
 * @returns {{[f:string]:any}}
 */
function parseTiledObject(el) {
    let data;
    if (null != (data = el.querySelector("ellipse"))) {
        const out = {
            type: "ellipse",
            id: parseInt(el.getAttribute("id")),
            x: parseFloat(el.getAttribute("x")),
            y: parseFloat(el.getAttribute("y")),
            width: parseFloat(el.getAttribute("width")),
            height: parseFloat(el.getAttribute("height")),
            props: getProperties(el) ?? {}
        };

        return out;
    }
    else if (null != (data = el.querySelector("point"))) {
        const out = {
            type: "point",
            id: parseInt(el.getAttribute("id")),
            x: parseFloat(el.getAttribute("x")),
            y: parseFloat(el.getAttribute("y")),
            props: getProperties(el) ?? {}
        };

        return out;
    }
    else if (null != (data = el.querySelector("polygon"))) {
        const originX = parseFloat(el.getAttribute("x"));
        const originY = parseFloat(el.getAttribute("y"));

        const points = [];
        for (const point of data.getAttribute("points").split(" ")) {
            const sep = point.indexOf(",");
            const x = parseFloat(point.substr(0, sep));
            const y = parseFloat(point.substr(sep + 1));
            points.push([originX + x, originY + y]);
        }

        const out = {
            type: "polygon",
            id: parseInt(el.getAttribute("id")),
            x: originX,
            y: originY,
            points,
            props: getProperties(el) ?? {}
        };

        return out;
    }
    else if (null != (data = el.querySelector("polyline"))) {
        const originX = parseFloat(el.getAttribute("x"));
        const originY = parseFloat(el.getAttribute("y"));

        const points = [];
        for (const point of data.getAttribute("points").split(" ")) {
            const sep = point.indexOf(",");
            const x = parseFloat(point.substr(0, sep));
            const y = parseFloat(point.substr(sep + 1));
            points.push([originX + x, originY + y]);
        }

        const out = {
            type: "polyline",
            id: parseInt(el.getAttribute("id")),
            x: originX,
            y: originY,
            points,
            props: getProperties(el) ?? {}
        };

        return out;
    }
    else if (null != (data = el.querySelector("text"))) {
        const out = {
            type: "text",
            id: parseInt(el.getAttribute("id")),
            x: parseFloat(el.getAttribute("x")),
            y: parseFloat(el.getAttribute("y")),
            width: parseFloat(el.getAttribute("width")),
            height: parseFloat(el.getAttribute("height")),
            text: {
                size: data.getAttribute("pixelsize"),
                wrap: parseInt(data.getAttribute("wrap")) === 1,
                content: data.textContent
            },
            props: getProperties(el) ?? {}
        };

        return out;
    }
    else {
        const out = {
            id:     parseInt    (el.getAttribute("id")),
            x:      parseFloat  (el.getAttribute("x")),
            y:      parseFloat  (el.getAttribute("y")),
            width: el.getAttribute("width"),
            height: el.getAttribute("height"),
            props: getProperties(el) ?? {}
        };

        const gid = el.getAttribute("gid");
        if (gid != null) {
            // if it has a `gid` attribute, it's a tile object
            out.type = "tile";
            out.tileId = gid;
        } else {
            // otherwise it's a rect object
            out.type = "rect";
        }

        return out;
    }
}

/** @param {Element} document */
async function transformTilemap(filePath, document) {
    const root = document.getElementsByTagName("map")[0];

    /******** STEP 1: read basic info ********/
    /** 
     * @type {{width:number,height:number,background:string,tilesets:{id:number,firstgid:number,path:string}[],collision:string[][],tile:number[][],object:{[n:string]:{[f:string]:any}[]}}} 
     */
    const result = {
        width: parseFloat(root.getAttribute("width")),
        height: parseFloat(root.getAttribute("height")),
        background: root.getAttribute("backgroundcolor"),
        tilesets: [],
        collision: [],
        tile: [],
        object: {}
    }

    /******** STEP 2: read tilesets ********/
    let tilesetId = 0;
    for (const tileset of root.getElementsByTagName("tileset")) {
        const id = tilesetId++;
        result.tilesets[id] = {
            id,
            firstgid: parseFloat(tileset.getAttribute("firstgid")),
            path: tileset.getAttribute("source")
        }
    }
    if (result.tilesets.length === 0) console.warn("")

    // load tilesets, these are temporary
    /** @type {{id: number,firstgid: number,data:{image:{path: string,width: number,height: number},tiles: {[id:number]:any}}}[]} */
    let tilesets = [];
    for (const t of result.tilesets) {
        tilesets.push({
            id: t.id,
            firstgid: t.firstgid,
            data: await loadTileset(path.join(path.dirname(filePath), 
                // the tileset is saved with '.xml', but tiled saves the path with '.tsx'
                t.path.replace(".tsx", ".xml")))
        })
    }
    tilesets = tilesets.sort((a, b) => a.firstgid - b.firstgid).reverse();

    /******** STEP 3: read tile layers ********/
    // get `<group>...</group>` element
    // then get all `<layer name="..."></layer>` elements from it
    // then sort the layers by name (ascending: 0, 1, 2 ...)
    const layers = [...root.getElementsByTagName("group")[0].getElementsByTagName("layer")]
        .sort((a, b) => parseFloat(a.getAttribute("name") - parseFloat(b.getAttribute("name"))));
    for (let layerIndex = 0; layerIndex < layers.length; ++layerIndex) {
        const layer = layers[layerIndex];
        const data = layer.getElementsByTagName("data")[0].textContent.replace(/\s+/g, "").split(",");
        for (let y = 0; y < data.length / result.width; ++y) {
            for (let x = 0; x < data.length / result.height; ++x) {
                const tileIndex = x + y * result.width;
                let gid = parseFloat(data[tileIndex]);
                // we don't care about flipping, just clear it
                // https://doc.mapeditor.org/en/stable/reference/tmx-map-format/#tile-flipping
                gid &= ~(FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG);
    
                // gid '0' means no tile
                let tilesetId;
                let tileId;
                if (gid === 0) {
                    // no tile => no collision
                    result.collision[tileIndex] = CollisionKind.None;
                    tilesetId = 0;
                    tileId = 0;
                }
                else {
                    // find the first tileset where the firstgid is less than or equal to current gid
                    // this is how Tiled organizes tile ids
                    // get the tile
                    const tileset = tilesets.find(ts => ts.firstgid <= gid);
                    if (tileset == null) {
                        // couldn't find tileset, which is an error
                        // should never actually happen though
                        throw new Error(`[File '${filePath}'] Could not find tileset for layer#${layerIndex}, expected tileset.firstgid < ${gid}`)
                    }
                    const tile = tileset.data.tiles[gid - tileset.firstgid];
                    
                    // resolve collision
                    if (tile.collision != null) {
                        if (CollisionKind[tile.collision] == null) {
                            throw new Error(`Invalid CollisionKind ${tile.collision}`)
                        }
                        result.collision[tileIndex] = CollisionKind[tile.collision];
                    }

                    tilesetId = tileset.id;
                    // the '1' is added because '0' has the special value "no tile"
                    tileId = (gid - tileset.firstgid) + 1;
                }

                // store the tile
                if (result.tile[layerIndex] == null) result.tile[layerIndex] = [];
                result.tile[layerIndex][tileIndex] = ((tilesetId << TILESET_ID_BIT_N) >>> 0) 
                                                   | ((tileId << TILE_ID_BIT_N) >>> 0);
            }
        }
    }
    
    /******** STEP 4: read object layer ********/
    for (const object of root.getElementsByTagName("objectgroup")[0].getElementsByTagName("object")) {
        const name = object.getAttribute("name");
        if (name == null) throw new Error(`[${filePath}] Object#${object.getAttribute("id")} is missing 'name'`);
        if (result.object[name] != null) throw new Error(`[${filePath}] Duplicate object name ${name}`);
        result.object[name] = parseTiledObject(object);

        if (result.object[name].type === "tile") {
            // resolve GID
            const tileset = tilesets.find(ts => ts.firstgid <= result.object[name].tileId);
            if (tileset == null) {
                // couldn't find tileset, which is an error
                // should never actually happen though
                throw new Error(`[File '${filePath}'] Could not find tileset for entity '${name}', expected tileset.firstgid < ${result.object[name].gid}`)
            }
            let tilesetId = tileset.id;
            let tileId = result.object[name].tileId - tileset.firstgid;
            result.object[name].tileId = ((tilesetId << TILESET_ID_BIT_N) >>> 0) 
                                    | ((tileId << TILE_ID_BIT_N) >>> 0);
        }
    }

    /******** STEP 5: cleanup ********/
    for (let tilesetIndex = 0; tilesetIndex < result.tilesets.length; ++tilesetIndex) {
        // each tileset will be represented just by its URI
        // also change ext from `.xml` to `.amt`
        result.tilesets[tilesetIndex] = result.tilesets[tilesetIndex].path.replace(".xml", ".amt");
    }

    // done!
    return result;
}

/** @param {Element} document */
function isTilesetXML(document) {
    // document root must have a "tileset" element with a "tiledversion" property
    for (let i = 0; i < document.children.length; ++i) {
        const el = document.children[i];
        if (el.tagName === "tileset" && el.attributes.getNamedItem("tiledversion") != null) {
            return true;
        }
    }
    return false;
}

/** 
 * @param {Element} node 
 * @param {string[]} omit
 * @returns {{[f:string]:any} | null}
 */
function getProperties(node, omit = []) {
    // map each property from `<properties><property name="..." value="..."></properties>`
    // to (name: value) pairs, then convert it to an object
    // NOTE: assuming only one `properties` element exists
    const propEl = node.getElementsByTagName("properties")[0];
    if (propEl == null) return null;
    const props = {};
    for (const prop of propEl.getElementsByTagName("property")) {
        const name = prop.getAttribute("name");
        if (!omit.includes(name)) props[prop.getAttribute("name")] = prop.getAttribute("value");
    }
    if (Object.keys(props).length === 0) return null;
    return props;
}

/** 
 * @param {string} filePath
 * @param {Element} document 
 * @param {string[]} omitTileProps
 */
function transformTileset(filePath, document, omitTileProps = []) {
    const root = document.getElementsByTagName("tileset")[0];

    // NOTE: assuming only one `image` element exists
    // we want this: `<image source="..." />`
    const image = root.getElementsByTagName("image")[0].getAttribute("source");
    
    // map each tile from `<tile id="..."><properties>...</properties></tile>`
    // to (id: properties) pairs, then convert it to an object
    /** @type {{[id:number]:any}} */
    const tiles = {};
    for (const tile of root.getElementsByTagName("tile")) {
        const props = getProperties(tile, omitTileProps);
        if (props != null) tiles[tile.getAttribute("id")] = props;
    }


    return { image, tiles }
}

/** @type {import("snowpack").SnowpackPluginFactory} */
module.exports = function (cfg, opt = {}) {
    return {
        name: "snowpack-plugin-tiled",
        resolve: {
            input: [".xml"],
            output: [".amt"]
        },
        async load({ filePath }) {
            const file = await fs.readFile(filePath, "utf-8");
            const xml = xmlParser.parseFromString(file, "text/xml");

            let data;
            if (isTilemapXML(xml)) {
                data = {
                    ".amt": JSON.stringify(await transformTilemap(filePath, xml))
                }
            }
            else if (isTilesetXML(xml)) {
                data = {
                    ".amt": JSON.stringify(transformTileset(filePath, xml, ["collision"]))
                }
            }
            return data;
        }
    }
}