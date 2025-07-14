import Debug from "debug";

export const createDebug = (namespace: string) => Debug(`croack:${namespace}`);
