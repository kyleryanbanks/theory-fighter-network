/**
 * Region definitions for collision, hurt, throw, and hit boxes
 * Supports both 2D and 3D games with circle/rectangle and sphere/cube shapes
 * 
 * Shape discrimination: radius field indicates circle/sphere; width/height/depth indicate rectangle/cube
 * No semantic keys or names on regions themselves—identity via parent (character or move phase)
 */

import { DataValue } from './shared';

/**
 * 2D Circular region
 */
export interface Region2DCircle {
  x: DataValue;
  y: DataValue;
  radius: DataValue;
}

export const createRegion2DCircle = (
  overrides: Partial<Region2DCircle> = {}
): Region2DCircle => ({
  x: { exact: 0 },
  y: { exact: 0 },
  radius: { exact: 0 },
  ...overrides,
});

/**
 * 2D Rectangular region
 */
export interface Region2DRectangle {
  x: DataValue;
  y: DataValue;
  width: DataValue;
  height: DataValue;
}

export const createRegion2DRectangle = (
  overrides: Partial<Region2DRectangle> = {}
): Region2DRectangle => ({
  x: { exact: 0 },
  y: { exact: 0 },
  width: { exact: 0 },
  height: { exact: 0 },
  ...overrides,
});

/**
 * 3D Spherical region
 */
export interface Region3DSphere {
  x: DataValue;
  y: DataValue;
  z: DataValue;
  radius: DataValue;
}

export const createRegion3DSphere = (
  overrides: Partial<Region3DSphere> = {}
): Region3DSphere => ({
  x: { exact: 0 },
  y: { exact: 0 },
  z: { exact: 0 },
  radius: { exact: 0 },
  ...overrides,
});

/**
 * 3D Cubic region
 */
export interface Region3DCube {
  x: DataValue;
  y: DataValue;
  z: DataValue;
  width: DataValue;
  height: DataValue;
  depth: DataValue;
}

export const createRegion3DCube = (
  overrides: Partial<Region3DCube> = {}
): Region3DCube => ({
  x: { exact: 0 },
  y: { exact: 0 },
  z: { exact: 0 },
  width: { exact: 0 },
  height: { exact: 0 },
  depth: { exact: 0 },
  ...overrides,
});

/**
 * Union type for all region shapes
 */
export type Region = Region2DCircle | Region2DRectangle | Region3DSphere | Region3DCube;
