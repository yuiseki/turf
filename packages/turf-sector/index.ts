import { Feature, Polygon, GeoJsonProperties } from "geojson";
import { circle } from "@turf/circle";
import { lineArc } from "@turf/line-arc";
import { coordEach } from "@turf/meta";
import { Units, Coord, isObject, polygon } from "@turf/helpers";
import { getCoords } from "@turf/invariant";

/**
 * Creates a circular sector of a circle of given radius and center {@link Point},
 * between (clockwise) bearing1 and bearing2; 0 bearing is North of center point, positive clockwise.
 *
 * @function
 * @param {Coord} center center point
 * @param {number} radius radius of the circle
 * @param {number} bearing1 angle, in decimal degrees, of the first radius of the sector
 * @param {number} bearing2 angle, in decimal degrees, of the second radius of the sector
 * @param {Object} [options={}] Optional parameters
 * @param {Units} [options.units='kilometers'] Supports all valid Turf {@link https://turfjs.org/docs/api/types/Units Units}
 * @param {number} [options.steps=64] number of steps
 * @param {Properties} [options.properties={}] Translate properties to Feature Polygon
 * @returns {Feature<Polygon>} sector polygon
 * @example
 * var center = turf.point([-75, 40]);
 * var radius = 5;
 * var bearing1 = 25;
 * var bearing2 = 45;
 *
 * var sector = turf.sector(center, radius, bearing1, bearing2);
 *
 * //addToMap
 * var addToMap = [center, sector];
 */
function sector(
  center: Coord,
  radius: number,
  bearing1: number,
  bearing2: number,
  options: {
    steps?: number;
    units?: Units;
    properties?: GeoJsonProperties;
  } = {}
): Feature<Polygon> {
  // Optional parameters
  options = options || {};
  if (!isObject(options)) throw new Error("options is invalid");
  // Most options only for passing through to circle()
  const properties = options.properties;

  // validation
  if (!center) throw new Error("center is required");
  if (bearing1 === undefined || bearing1 === null)
    throw new Error("bearing1 is required");
  if (bearing2 === undefined || bearing2 === null)
    throw new Error("bearing2 is required");
  if (!radius) throw new Error("radius is required");
  if (typeof options !== "object") throw new Error("options must be an object");

  if (convertAngleTo360(bearing1) === convertAngleTo360(bearing2)) {
    return circle(center, radius, options);
  }
  const coords = getCoords(center);
  const arc = lineArc(center, radius, bearing1, bearing2, options);
  const sliceCoords = [[coords]];
  coordEach(arc, function (currentCoords) {
    sliceCoords[0].push(currentCoords);
  });
  sliceCoords[0].push(coords);

  return polygon(sliceCoords, properties);
}

/**
 * Takes any angle in degrees
 * and returns a valid angle between 0-360 degrees
 *
 * @private
 * @param {number} alpha angle between -180-180 degrees
 * @returns {number} angle between 0-360 degrees
 */
function convertAngleTo360(alpha: number) {
  let beta = alpha % 360;
  if (beta < 0) {
    beta += 360;
  }
  return beta;
}

export { sector };
export default sector;
