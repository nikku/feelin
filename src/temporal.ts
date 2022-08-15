import {
  DateTime,
  Duration,
  FixedOffsetZone,
  Info,
  Zone
} from 'luxon';

import { notImplemented } from './utils';


export function ms(temporal) {

  if (isDateTime(temporal)) {
    return temporal.valueOf();
  }

  if (isDuration(temporal)) {
    return temporal.valueOf();
  }

  return null;
}

export function isDateTime(obj): obj is DateTime {
  return DateTime.isDateTime(obj);
}

export function isDuration(obj): obj is Duration {
  return Duration.isDuration(obj);
}

export function duration(opts: string|number) : Duration {

  if (typeof opts === 'number') {
    return Duration.fromMillis(opts);
  }

  return Duration.fromISO(opts);
}

export function date(str: string = null, time: string = null, zone: Zone = null) : DateTime {

  if (time) {
    if (str) {
      throw new Error('<str> and <time> provided');
    }

    return date(`1900-01-01T${ time }`);
  }

  if (typeof str === 'string') {

    if (str.startsWith('-')) {
      throw notImplemented('negative date');
    }

    if (!str.includes('T')) {

      // raw dates are in UTC time zone
      return date(str + 'T00:00:00.000Z');
    }

    if (str.includes('@')) {

      if (zone) {
        throw new Error('<zone> already provided');
      }

      const [ datePart, zonePart ] = str.split('@');

      return date(datePart, null, Info.normalizeZone(zonePart));
    }

    return DateTime.fromISO(str.toUpperCase(), {
      setZone: true,
      zone
    });
  }

  return DateTime.now();
}