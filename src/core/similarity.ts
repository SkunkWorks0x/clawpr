const STOP_WORDS = new Set(['the','a','an','and','or','but','in','on','at','to','of','with','by','from','is','are','was','were','be','been','being','have','has','had','do','does','did','will','would','could','should','may','might','shall','can','that','these','those','its','me','my','we','our','you','your','he','him','his','she','her','they','them','their','what','which','who','whom','how','when','where','why','than','too','very','just','only','also','about','up','out','so','as','into','over','after','before','between','under','above','below','each','every','both','few','more','most','other','some','such','any']);

export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length >= 3 && !STOP_WORDS.has(token));
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  if (tokens.length === 0) return tf;

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  for (const [token, count] of counts) {
    tf.set(token, count / tokens.length);
  }
  return tf;
}

export function inverseDocumentFrequency(corpus: string[][]): Map<string, number> {
  const idf = new Map<string, number>();
  const n = corpus.length;
  if (n === 0) return idf;

  const docFreq = new Map<string, number>();
  for (const doc of corpus) {
    const uniqueTokens = new Set(doc);
    for (const token of uniqueTokens) {
      docFreq.set(token, (docFreq.get(token) ?? 0) + 1);
    }
  }

  for (const [token, df] of docFreq) {
    idf.set(token, Math.log(1 + n / (1 + df)));
  }
  return idf;
}

export function tfidfVector(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFrequency(tokens);
  const vector = new Map<string, number>();
  for (const [token, tfVal] of tf) {
    const idfVal = idf.get(token) ?? 0;
    vector.set(token, tfVal * idfVal);
  }
  return vector;
}

export function cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
  if (vecA.size === 0 || vecB.size === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const [key, val] of vecA) {
    normA += val * val;
    const bVal = vecB.get(key);
    if (bVal !== undefined) {
      dotProduct += val * bVal;
    }
  }

  for (const [, val] of vecB) {
    normB += val * val;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dotProduct / denom;
}

export function jaccardSimilarity(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return intersection / union;
}

export function fileOverlapJaccard(filesA: string[], filesB: string[]): number {
  return jaccardSimilarity(new Set(filesA), new Set(filesB));
}

export function combinedSimilarity(textA: string, textB: string, corpus?: string[][]): number {
  if (!textA && !textB) return 0;
  if (textA === textB) return 1;
  if (!textA || !textB) return 0;

  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 && tokensB.length === 0) return 0;
  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const docCorpus = corpus ?? [tokensA, tokensB];
  const idf = inverseDocumentFrequency(docCorpus);

  const vecA = tfidfVector(tokensA, idf);
  const vecB = tfidfVector(tokensB, idf);

  const cosine = cosineSimilarity(vecA, vecB);
  const jaccard = jaccardSimilarity(new Set(tokensA), new Set(tokensB));

  return 0.6 * cosine + 0.4 * jaccard;
}
