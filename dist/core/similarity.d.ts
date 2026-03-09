export declare function tokenize(text: string): string[];
export declare function termFrequency(tokens: string[]): Map<string, number>;
export declare function inverseDocumentFrequency(corpus: string[][]): Map<string, number>;
export declare function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number>;
export declare function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number;
export declare function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number;
export declare function fileOverlapJaccard(filesA: string[], filesB: string[]): number;
export declare function combinedSimilarity(textA: string, textB: string, corpus?: string[][]): number;
