// Kiểu cho scripts/gen-tokens.mjs để test TypeScript import được bộ sinh token.
export declare const TOKENS_PATH: string;
export declare const OUTPUT: { tokens: string; theme: string };
export declare function readTokens(path?: string): unknown;
export declare function generate(tokens: unknown): { tokensCss: string; themeCss: string };
export declare function readOutputs(): { tokensCss: string; themeCss: string };
