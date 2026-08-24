import type { WorldModelData } from '@/types/world-model';
import { WorldModelImpl } from './world-model';

// Import the generated JSON at build time. Run `npm run build:data` to regenerate.
import worldModelData from '@/data/generated/world-model.json';

const data = worldModelData as unknown as WorldModelData;

export const worldModel = new WorldModelImpl(data.observations, data.world_population);
