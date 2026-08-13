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

/**
 * 2D Rectangular region
 */
export interface Region2DRectangle {
  x: DataValue;
  y: DataValue;
  width: DataValue;
  height: DataValue;
}

/**
 * 3D Spherical region
 */
export interface Region3DSphere {
  x: DataValue;
  y: DataValue;
  z: DataValue;
  radius: DataValue;
}

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

/**
 * Union type for all region shapes
 */
export type Region = Region2DCircle | Region2DRectangle | Region3DSphere | Region3DCube;
