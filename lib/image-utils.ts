import * as ImageManipulator from 'expo-image-manipulator';
import { logger } from './logger';
import { captureException } from './sentry';

interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: ImageOptimizationOptions = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  format: 'jpeg',
};

export async function optimizeImage(
  uri: string,
  options: ImageOptimizationOptions = {}
): Promise<string | null> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    logger.info('Optimizing image', { uri, options: opts });

    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: opts.maxWidth,
            height: opts.maxHeight,
          },
        },
      ],
      {
        compress: opts.quality,
        format: opts.format === 'png' 
          ? ImageManipulator.SaveFormat.PNG 
          : ImageManipulator.SaveFormat.JPEG,
      }
    );

    logger.info('Image optimized successfully', { 
      originalUri: uri,
      optimizedUri: manipulatedImage.uri,
      width: manipulatedImage.width,
      height: manipulatedImage.height,
    });

    return manipulatedImage.uri;
  } catch (error) {
    logger.error('Failed to optimize image', error, { uri });
    captureException(error, { context: 'image-optimization', uri });
    return null;
  }
}

export async function createThumbnail(uri: string): Promise<string | null> {
  return optimizeImage(uri, {
    maxWidth: 200,
    maxHeight: 200,
    quality: 0.7,
    format: 'jpeg',
  });
}
