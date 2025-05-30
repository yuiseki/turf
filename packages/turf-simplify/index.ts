import { Geometry, Position } from "geojson";
import { cleanCoords } from "@turf/clean-coords";
import { clone } from "@turf/clone";
import { geomEach } from "@turf/meta";
import { AllGeoJSON, isObject } from "@turf/helpers";
import { simplify as simplifyJS } from "./lib/simplify.js";

/**
 * Simplifies the geometries in a GeoJSON object. Uses the 2d version of
 * [simplify-js](https://mourner.github.io/simplify-js/).
 *
 * @function
 * @param {GeoJSON} geojson GeoJSON object to be simplified
 * @param {Object} [options={}] Optional parameters
 * @param {number} [options.tolerance=1] Simplification tolerance
 * @param {boolean} [options.highQuality=false] Produce a higher-quality simplification using a slower algorithm
 * @param {boolean} [options.mutate=false] Allow GeoJSON input to be mutated (significant performance improvement if true)
 * @returns {GeoJSON} Simplified GeoJSON
 * @example
 * const geojson = turf.polygon([[
 *   [-70.603637, -33.399918],
 *   [-70.614624, -33.395332],
 *   [-70.639343, -33.392466],
 *   [-70.659942, -33.394759],
 *   [-70.683975, -33.404504],
 *   [-70.697021, -33.419406],
 *   [-70.701141, -33.434306],
 *   [-70.700454, -33.446339],
 *   [-70.694274, -33.458369],
 *   [-70.682601, -33.465816],
 *   [-70.668869, -33.472117],
 *   [-70.646209, -33.473835],
 *   [-70.624923, -33.472117],
 *   [-70.609817, -33.468107],
 *   [-70.595397, -33.458369],
 *   [-70.587158, -33.442901],
 *   [-70.587158, -33.426283],
 *   [-70.590591, -33.414248],
 *   [-70.594711, -33.406224],
 *   [-70.603637, -33.399918]
 * ]]);
 * const result0_01 = turf.simplify(geojson, {tolerance: 0.01 });
 * const result0_005 = turf.simplify(geojson, {tolerance: 0.005 });
 *
 * //addToMap
 * const addToMap = [geojson, result0_01, result0_005]
 */
function simplify<T extends AllGeoJSON>(
  geojson: T,
  options: {
    tolerance?: number;
    highQuality?: boolean;
    mutate?: boolean;
  } = {}
): T {
  // Optional parameters
  options = options ?? {};
  if (!isObject(options)) throw new Error("options is invalid");
  const tolerance = options.tolerance ?? 1;
  const highQuality = options.highQuality ?? false;
  const mutate = options.mutate ?? false;

  if (!geojson) throw new Error("geojson is required");
  if (tolerance && tolerance < 0) throw new Error("invalid tolerance");

  // Clone geojson to avoid side effects
  if (mutate !== true) geojson = clone(geojson);

  geomEach(geojson, function (geom) {
    simplifyGeom(geom, tolerance, highQuality);
  });
  return geojson;
}

/**
 * Simplifies a feature's coordinates
 *
 * @private
 * @param {Geometry} geometry to be simplified
 * @param {number} [tolerance=1] simplification tolerance
 * @param {boolean} [highQuality=false] whether or not to spend more time to create a higher-quality simplification with a different algorithm
 * @returns {Geometry} output
 */
function simplifyGeom(
  geometry: Geometry,
  tolerance: number,
  highQuality: boolean
) {
  const type = geometry.type;

  // "unsimplyfiable" geometry types
  if (type === "Point" || type === "MultiPoint") return geometry;

  // Remove any extra coordinates
  cleanCoords(geometry, { mutate: true });

  if (type !== "GeometryCollection") {
    // TODO should this cater for GeometryCollections too?
    switch (type) {
      case "LineString":
        geometry.coordinates = simplifyJS(
          geometry.coordinates,
          tolerance,
          highQuality
        );
        break;
      case "MultiLineString":
        geometry.coordinates = geometry.coordinates.map((lines) =>
          simplifyJS(lines, tolerance, highQuality)
        );
        break;
      case "Polygon":
        geometry.coordinates = simplifyPolygon(
          geometry.coordinates,
          tolerance,
          highQuality
        );
        break;
      case "MultiPolygon":
        geometry.coordinates = geometry.coordinates.map((rings) =>
          simplifyPolygon(rings, tolerance, highQuality)
        );
    }
  }

  return geometry;
}

/**
 * Simplifies the coordinates of a Polygon with simplify-js
 *
 * @private
 * @param {Array<number>} coordinates to be processed
 * @param {number} tolerance simplification tolerance
 * @param {boolean} highQuality whether or not to spend more time to create a higher-quality
 * @returns {Array<Array<Array<number>>>} simplified coords
 */
function simplifyPolygon(
  coordinates: Position[][],
  tolerance: number,
  highQuality: boolean
) {
  return coordinates.map(function (ring) {
    if (ring.length < 4) {
      throw new Error("invalid polygon");
    }
    let ringTolerance = tolerance;
    let simpleRing = simplifyJS(ring, ringTolerance, highQuality);

    // If simplified ring isn't valid (has been over simplified) reduce the
    // tolerance by 1% and try again.
    while (!checkValidity(simpleRing) && ringTolerance >= Number.EPSILON) {
      ringTolerance -= ringTolerance * 0.01;
      simpleRing = simplifyJS(ring, ringTolerance, highQuality);
    }

    // If ring wasn't able to be simplified in a valid way, return it unchanged.
    if (!checkValidity(simpleRing)) {
      return ring;
    }

    // Close the ring if it wasn't already.
    if (
      simpleRing[simpleRing.length - 1][0] !== simpleRing[0][0] ||
      simpleRing[simpleRing.length - 1][1] !== simpleRing[0][1]
    ) {
      simpleRing.push(simpleRing[0]);
    }
    return simpleRing;
  });
}

/**
 * Returns true if ring has at least 3 coordinates and its first coordinate is the same as its last
 *
 * @private
 * @param {Array<number>} ring coordinates to be checked
 * @returns {boolean} true if valid
 */
function checkValidity(ring: Position[]) {
  if (ring.length < 3) return false;
  //if the last point is the same as the first, it's not a triangle
  return !(
    ring.length === 3 &&
    ring[2][0] === ring[0][0] &&
    ring[2][1] === ring[0][1]
  );
}

export { simplify };
export default simplify;
