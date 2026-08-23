export const gameId = process.env.NEXT_PUBLIC_GAME_ID ?? null;
export const gameName = process.env.NEXT_PUBLIC_GAME_NAME ?? 'Planet1000 Hub';
export const gameBlurb = process.env.NEXT_PUBLIC_GAME_BLURB ?? null;
export const ageTier = (process.env.NEXT_PUBLIC_AGE_TIER ?? 'ms') as 'ms' | 'hs';

export const isSingleGameMode = gameId !== null;
