import * as Layer from 'effect/Layer';
import { logLayer } from './log.layer';
import { DbLayer } from './db.layer';
import { FileSystem } from '@effect/platform/FileSystem';

export const fileSystemLayer = FileSystem.layer;

export const infraLayer = Layer.mergeAll(fileSystemLayer, logLayer, DbLayer);

