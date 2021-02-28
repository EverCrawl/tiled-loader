
import { load } from "./core";

function plugin() {
    return {
        name: "snowpack-plugin-tiled",
        resolve: {
            input: [".xml"],
            output: [".amt"]
        },
        load
    }
}

export default plugin;