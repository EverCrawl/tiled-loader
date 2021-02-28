export declare function load({ filePath }: {
    filePath: string;
}): Promise<{
    ".amt": string;
} | undefined>;
export declare const CollisionKind: Readonly<{
    readonly 0: "None";
    readonly 1: "Full";
    readonly 2: "Ladder";
    readonly 3: "Platform";
    readonly 4: "SlopeLeft";
    readonly 5: "SlopeRight";
    readonly 6: "SlopeLeftBottom";
    readonly 7: "SlopeRightBottom";
    readonly 8: "SlopeLeftTop";
    readonly 9: "SlopeRightTop";
    readonly None: 0;
    readonly Full: 1;
    readonly Ladder: 2;
    readonly Platform: 3;
    readonly SlopeLeft: 4;
    readonly SlopeRight: 5;
    readonly SlopeLeftBottom: 6;
    readonly SlopeRightBottom: 7;
    readonly SlopeLeftTop: 8;
    readonly SlopeRightTop: 9;
}>;
export declare type CollisionKind = typeof CollisionKind;
export declare function isTilemapXML(document: Element): boolean;
export interface Template {
    type: string;
    width: number;
    height: number;
    props?: Properties;
}
export declare function loadTemplate(filePath: string): Promise<Template>;
export interface ParsedObject {
    [f: string]: any;
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
export declare function transformTilemap(filePath: string, document: Element): Promise<TransformedTilemap>;
export declare function isTilesetXML(document: Element): boolean;
export interface Properties {
    [field: string]: any;
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
export declare function transformTileset(filePath: string, document: Element, omitTileProps?: string[]): TransformedTileset;
