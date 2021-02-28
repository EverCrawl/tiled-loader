
// TODO: change to .ts
// TODO: include a build step
// TODO: setup build in `prepare` script
// TODO: make some tests + setup auto testing

import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";
const DOM = new JSDOM("");
const xmlParser = new DOM.window.DOMParser;

export async function load(opt: { filePath: string }) {
    return Promise.resolve(loadSync(opt));
}

export function loadSync({ filePath }: { filePath: string }) {
    const file = fs.readFileSync(filePath, "utf-8");
    const xml = xmlParser.parseFromString(file, "text/xml") as unknown as Element;

    let data;
    if (isTilemapXML(xml)) {
        data = {
            ".amt": JSON.stringify(transformTilemap(filePath, xml))
        }
    }
    else if (isTilesetXML(xml)) {
        data = {
            ".amt": JSON.stringify(transformTileset(filePath, xml, ["collision"]))
        }
    }
    return data;
}

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG = 0x20000000;
const TILE_ID_BIT_N = 0;
const TILESET_ID_BIT_N = 10;

export const CollisionKind = Object.freeze({
    0: "None",
    1: "Full",
    2: "Ladder",
    3: "Platform",
    4: "SlopeLeft",
    5: "SlopeRight",
    6: "SlopeLeftBottom",
    7: "SlopeRightBottom",
    8: "SlopeLeftTop",
    9: "SlopeRightTop",
    "None": 0,
    "Full": 1,
    "Ladder": 2,
    "Platform": 3,
    "SlopeLeft": 4,
    "SlopeRight": 5,
    "SlopeLeftBottom": 6,
    "SlopeRightBottom": 7,
    "SlopeLeftTop": 8,
    "SlopeRightTop": 9,
} as const);
export type CollisionKind = typeof CollisionKind;

export function isTilemapXML(document: Element) {
    // document root must have a "map" element with a "tiledversion" property
    for (let i = 0; i < document.children.length; ++i) {
        const el = document.children[i];
        if (el.tagName === "map" && el.attributes.getNamedItem("tiledversion") != null) {
            return true;
        }
    }
    return false;
}

export interface Template {
    type: string,
    width: number,
    height: number,
    props?: Properties
}

export function loadTemplate(filePath: string): Template {
    /* console.log("template", filePath); */
    // TODO: handle non-rect objects
    const xml = xmlParser.parseFromString(
        fs.readFileSync(filePath, "utf-8"),
        "text/xml");

    const root = xml.getElementsByTagName("template")[0];
    const object = root.getElementsByTagName("object")[0];

    const props = getProperties(object);

    return {
        type: object.getAttribute("type")!,
        width: parseFloat(object.getAttribute("width")!) ?? undefined,
        height: parseFloat(object.getAttribute("height")!) ?? undefined,
        props: Object.keys(props ?? {}).length > 0 ? props! : undefined
    };
}

function loadTileset(filePath: string) {
    return transformTileset(filePath,
        xmlParser.parseFromString(
            fs.readFileSync(filePath, "utf-8"),
            "text/xml") as unknown as Element);

}

export interface ParsedObject {
    [f: string]: any;
}

function parseTiledObject(el: Element, baseDir: string): ParsedObject {
    const templateAttr = el.getAttribute("template");
    let template: Template | undefined;
    if (templateAttr != null) template = loadTemplate(path.join(baseDir, templateAttr));

    const props = {
        ...(template?.props ?? {}),
        ...(getProperties(el) ?? {})
    };

    const width = el.getAttribute("width") ?? template?.width ?? null;
    const height = el.getAttribute("height") ?? template?.height ?? null;

    let data;
    if (null != (data = el.querySelector("ellipse"))) {
        const out = {
            type: template?.type ?? "ellipse",
            id: parseInt(el.getAttribute("id")!),
            x: parseFloat(el.getAttribute("x")!),
            y: parseFloat(el.getAttribute("y")!),
            width, height,
            props: Object.keys(props).length > 0 ? props : undefined
        };

        return out;
    }
    else if (null != (data = el.querySelector("point"))) {
        const out = {
            type: template?.type ?? "point",
            id: parseInt(el.getAttribute("id")!),
            x: parseFloat(el.getAttribute("x")!),
            y: parseFloat(el.getAttribute("y")!),
            props: Object.keys(props).length > 0 ? props : undefined
        };

        return out;
    }
    else if (null != (data = el.querySelector("polygon"))) {
        const originX = parseFloat(el.getAttribute("x")!);
        const originY = parseFloat(el.getAttribute("y")!);

        const points = [];
        for (const point of data.getAttribute("points")!.split(" ")) {
            const sep = point.indexOf(",");
            const x = parseFloat(point.substr(0, sep));
            const y = parseFloat(point.substr(sep + 1));
            points.push([originX + x, originY + y]);
        }

        const out = {
            type: template?.type ?? "polygon",
            id: parseInt(el.getAttribute("id")!),
            x: originX,
            y: originY,
            points,
            props: Object.keys(props).length > 0 ? props : undefined
        };

        return out;
    }
    else if (null != (data = el.querySelector("polyline"))) {
        const originX = parseFloat(el.getAttribute("x")!);
        const originY = parseFloat(el.getAttribute("y")!);

        const points = [];
        for (const point of data.getAttribute("points")!.split(" ")) {
            const sep = point.indexOf(",");
            const x = parseFloat(point.substr(0, sep));
            const y = parseFloat(point.substr(sep + 1));
            points.push([originX + x, originY + y]);
        }

        const out = {
            type: template?.type ?? "polyline",
            id: parseInt(el.getAttribute("id")!),
            x: originX,
            y: originY,
            points,
            props: Object.keys(props).length > 0 ? props : undefined
        };

        return out;
    }
    else if (null != (data = el.querySelector("text"))) {
        const out = {
            type: template?.type ?? "text",
            id: parseInt(el.getAttribute("id")!),
            x: parseFloat(el.getAttribute("x")!),
            y: parseFloat(el.getAttribute("y")!),
            width, height,
            text: {
                size: data.getAttribute("pixelsize"),
                wrap: parseInt(data.getAttribute("wrap")!) === 1,
                content: data.textContent
            },
            props: Object.keys(props).length > 0 ? props : undefined
        };

        return out;
    }
    else {
        const out = {
            type: template?.type ?? undefined,
            id: parseInt(el.getAttribute("id")!),
            x: parseFloat(el.getAttribute("x")!),
            y: parseFloat(el.getAttribute("y")!),
            width, height,
            props: Object.keys(props).length > 0 ? props : undefined
        };

        const gid = el.getAttribute("gid");
        if (gid != null) {
            // if it has a `gid` attribute, it's a tile object
            // NOTE: don't re-assign type if it is inherited from a template
            if (out.type === undefined) (<any>out).type = "tile";
            (<any>out).tileId = gid;
        } else {
            // otherwise it's a rect object
            if (out.type === undefined) (<any>out).type = "rect";
        }

        return out;
    }
}

export interface TransformedTilemap {
    width: number;
    height: number;
    background: string;
    tilesets: {
        id: number;
        firstgid: number;
        path: string;
    }[];
    collision: number[];
    tile: number[][];
    object: {
        [n: string]: {
            [f: string]: any;
        };
    };
}

interface TempTileset {
    id: number;
    firstgid: number;
    data: {
        image: {
            path: string;
            width: number;
            height: number;
        };
        tiles: {
            [id: number]: {
                anim: any;
                props: any;
            };
        };
    };
}

export function transformTilemap(filePath: string, document: Element) {
    const root = document.getElementsByTagName("map")[0];

    /******** STEP 1: read basic info ********/
    const result: TransformedTilemap = {
        width: parseFloat(root.getAttribute("width")!),
        height: parseFloat(root.getAttribute("height")!),
        background: root.getAttribute("backgroundcolor")!,
        tilesets: [],
        collision: [],
        tile: [],
        object: {}
    }

    /******** STEP 2: read tilesets ********/
    let tilesetId = 0;
    // @ts-ignore
    for (const tileset of root.getElementsByTagName("tileset")) {
        const id = tilesetId++;
        result.tilesets[id] = {
            id,
            firstgid: parseFloat(tileset.getAttribute("firstgid")!),
            path: tileset.getAttribute("source")!
        }
    }
    if (result.tilesets.length === 0) console.warn("")

    // load tilesets, these are temporary
    let tilesets: TempTileset[] = [];
    for (const t of result.tilesets) {
        tilesets.push({
            id: t.id,
            firstgid: t.firstgid,
            data: (loadTileset(path.join(path.dirname(filePath),
                // the tileset is saved with '.xml', but tiled saves the path with '.tsx'
                t.path.replace(".tsx", ".xml")))) as any
        })
    }
    tilesets = tilesets.sort((a, b) => a.firstgid - b.firstgid).reverse();
    /* console.log("temp tilesets");
    for (const tileset of tilesets) {
        console.log(tileset.data.image);
        for (const tile of Object.values(tileset.data.tiles)) {
            console.log(tile);
        }
    } */

    /******** STEP 3: read tile layers ********/
    // get `<group>...</group>` element
    // then get all `<layer name="..."></layer>` elements from it
    // then sort the layers by name (ascending: 0, 1, 2 ...)
    // @ts-ignore
    const layers = [...root.getElementsByTagName("group")[0].getElementsByTagName("layer")]
        .sort((a, b) => parseFloat(a.getAttribute("name")!) - parseFloat(b.getAttribute("name")!));
    for (let layerIndex = 0; layerIndex < layers.length; ++layerIndex) {
        const layer = layers[layerIndex];
        const data = layer.getElementsByTagName("data")[0].textContent!.replace(/\s+/g, "").split(",");
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
                    if (result.collision[tileIndex] == null) {
                        // we only want to set it to None if it doesn't 
                        // already have some collision value
                        result.collision[tileIndex] = CollisionKind.None;
                    }
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
                    if (tile.props?.collision != null) {
                        const ck = CollisionKind[tile.props.collision as keyof CollisionKind] as number;
                        if (ck == null) {
                            throw new Error(`Invalid CollisionKind ${tile.props.collision}`)
                        }
                        result.collision[tileIndex] = ck;
                    } else if (result.collision[tileIndex] == null) {
                        result.collision[tileIndex] = CollisionKind.None;
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
    // @ts-ignore
    for (const object of root.getElementsByTagName("objectgroup")[0].getElementsByTagName("object")) {
        const name = object.getAttribute("name");
        if (name == null) throw new Error(`[${filePath}] Object#${object.getAttribute("id")} is missing 'name'`);
        if (result.object[name] != null) throw new Error(`[${filePath}] Duplicate object name ${name}`);
        result.object[name] = parseTiledObject(object, path.dirname(filePath));

        if (result.object[name].type === "tile") {
            // resolve GID
            const tileset = tilesets.find(ts => ts.firstgid <= result.object[name].tileId);
            if (tileset == null) {
                // couldn't find tileset, which is an error
                // should never actually happen though
                throw new Error(`[File '${filePath}'] Could not find tileset for entity '${name}', expected tileset.firstgid < ${result.object[name].gid}`)
            }
            const tilesetId = tileset.id;
            const tileId = result.object[name].tileId - tileset.firstgid;
            result.object[name].tileId = ((tilesetId << TILESET_ID_BIT_N) >>> 0)
                | ((tileId << TILE_ID_BIT_N) >>> 0);
        }
    }

    /******** STEP 5: cleanup ********/
    for (let tilesetIndex = 0; tilesetIndex < result.tilesets.length; ++tilesetIndex) {
        // each tileset will be represented just by its URI
        // also change ext from `.xml` to `.amt`
        (result.tilesets as unknown as string[])[tilesetIndex] = result.tilesets[tilesetIndex].path.replace(".xml", ".amt");
    }

    // done!
    return result;
}

export function isTilesetXML(document: Element) {
    // document root must have a "tileset" element with a "tiledversion" property
    for (let i = 0; i < document.children.length; ++i) {
        const el = document.children[i];
        if (el.tagName === "tileset" && el.attributes.getNamedItem("tiledversion") != null) {
            return true;
        }
    }
    return false;
}

export interface Properties {
    [field: string]: any
}

function getProperties(node: Element, omit: string[] = []): Properties | null {
    // map each property from `<properties><property name="..." value="..."></properties>`
    // to (name: value) pairs, then convert it to an object
    // NOTE: assuming only one `properties` element exists
    const propEl = node.getElementsByTagName("properties")[0];
    if (propEl == null) return null;
    const props: Properties = {};

    // type cast here because HTMLCollection *is* iterable
    // @ts-ignore
    for (const prop of propEl.getElementsByTagName("property")) {
        const name = prop.getAttribute("name")!;
        if (!omit.includes(name)) props[prop.getAttribute("name")!] = prop.getAttribute("value");
    }
    if (Object.keys(props).length === 0) return null;
    return props;
}

function getAnimation(node: Element): number[] | null {
    // TEMP: every animation steps at 150ms 
    // TODO: have per-animation steps -> instance animated tiles (?)
    const animEl = node.getElementsByTagName("animation")[0];
    if (animEl == null) return null;
    const frames = [];

    // type cast here because HTMLCollection *is* iterable
    // @ts-ignore
    for (const frame of animEl.getElementsByTagName("frame")) {
        const tid = parseInt(frame.getAttribute("tileid")!);
        frames.push(tid);
    }
    return frames;
}

export interface TransformedTileset {
    image: string | null;
    tiles: {
        [id: number]: {
            anim: any;
            props: any;
        };
    };
}

export function transformTileset(filePath: string, document: Element, omitTileProps: string[] = []): TransformedTileset {
    const root = document.getElementsByTagName("tileset")[0];

    // NOTE: assuming only one `image` element exists
    // we want this: `<image source="..." />`
    const image = root.getElementsByTagName("image")[0].getAttribute("source");

    // map each tile from `<tile id="..."><properties>...</properties></tile>`
    // to (id: properties) pairs, then convert it to an object
    const tiles: { [id: number]: { anim: any; props: any; }; } = {};
    // @ts-ignore
    for (const tile of root.getElementsByTagName("tile")) {
        const tileData: { anim: any; props: any; } = {} as any;
        const anim = getAnimation(tile);
        if (anim != null) tileData.anim = anim;
        const props = getProperties(tile, omitTileProps);
        if (props != null) tileData.props = props;
        if (Object.keys(tileData).length > 0) {
            tiles[parseInt(tile.getAttribute("id")!)] = tileData;
        }
    }

    return { image, tiles }
}