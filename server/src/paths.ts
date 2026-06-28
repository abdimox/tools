import { fileURLToPath } from 'node:url';

export const uploadDir = fileURLToPath(new URL('../temp-uploads/', import.meta.url));
export const outputDir = fileURLToPath(new URL('../temp-outputs/', import.meta.url));

