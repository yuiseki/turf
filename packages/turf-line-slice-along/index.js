import { bearing } from "@turf/bearing";
import { distance } from "@turf/distance";
import { destination } from "@turf/destination";
import { lineString, isObject } from "@turf/helpers";

/**
 * Takes a {@link LineString|line}, a specified distance along the line to a start {@link Point},
 * and a specified  distance along the line to a stop point
 * and returns a subsection of the line in-between those points.
 *
 * This can be useful for extracting only the part of a route between two distances.
 *
 * @function
 * @param {Feature<LineString>|LineString} line input line
 * @param {number} startDist distance along the line to starting point
 * @param {number} stopDist distance along the line to ending point
 * @param {Object} [options={}] Optional parameters
 * @param {Units} [options.units='kilometers'] Supports all valid Turf {@link https://turfjs.org/docs/api/types/Units Units}
 * @returns {Feature<LineString>} sliced line
 * @example
 * var line = turf.lineString([[7, 45], [9, 45], [14, 40], [14, 41]]);
 * var start = 12.5;
 * var stop = 25;
 * var sliced = turf.lineSliceAlong(line, start, stop, {units: 'miles'});
 *
 * //addToMap
 * var addToMap = [line, start, stop, sliced]
 */
function lineSliceAlong(line, startDist, stopDist, options) {
  // Optional parameters
  options = options || {};
  if (!isObject(options)) throw new Error("options is invalid");

  var coords;
  var slice = [];

  // Validation
  if (line.type === "Feature") coords = line.geometry.coordinates;
  else if (line.type === "LineString") coords = line.coordinates;
  else throw new Error("input must be a LineString Feature or Geometry");
  var origCoordsLength = coords.length;
  var travelled = 0;
  var overshot, direction, interpolated;
  for (var i = 0; i < coords.length; i++) {
    if (startDist >= travelled && i === coords.length - 1) break;
    else if (travelled > startDist && slice.length === 0) {
      overshot = startDist - travelled;
      if (!overshot) {
        slice.push(coords[i]);
        return lineString(slice);
      }
      direction = bearing(coords[i], coords[i - 1]) - 180;
      interpolated = destination(coords[i], overshot, direction, options);
      slice.push(interpolated.geometry.coordinates);
    }

    if (travelled >= stopDist) {
      overshot = stopDist - travelled;
      if (!overshot) {
        slice.push(coords[i]);
        return lineString(slice);
      }
      direction = bearing(coords[i], coords[i - 1]) - 180;
      interpolated = destination(coords[i], overshot, direction, options);
      slice.push(interpolated.geometry.coordinates);
      return lineString(slice);
    }

    if (travelled >= startDist) {
      slice.push(coords[i]);
    }

    if (i === coords.length - 1) {
      return lineString(slice);
    }

    travelled += distance(coords[i], coords[i + 1], options);
  }

  if (travelled < startDist && coords.length === origCoordsLength)
    throw new Error("Start position is beyond line");

  var last = coords[coords.length - 1];
  return lineString([last, last]);
}

export { lineSliceAlong };
export default lineSliceAlong;
