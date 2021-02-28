export * from "./core";
import { load } from "./core";
declare function plugin(): {
    name: string;
    resolve: {
        input: string[];
        output: string[];
    };
    load: typeof load;
};
export default plugin;
