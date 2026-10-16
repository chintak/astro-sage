import { slug } from "github-slugger";

/** Slugify with the same algorithm used for heading IDs. */
export const slugifyStr = (str: string): string => slug(str);

export const slugifyAll = (arr: string[]) => arr.map(str => slugifyStr(str));
