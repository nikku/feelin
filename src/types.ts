
  switch (type) {
  case 'Boolean': return typeof el === 'boolean';
  case 'Number': return typeof el === 'number';

  default: return false;
  }
export function isType(el: string, type: string): boolean {
}

export type RangeProps = {
  'start included': boolean,
  'end included': boolean,
  start: string|number|null,
  end: string|number|null,
  map<T>(fn: (val: any) => T): T[],
  includes(val: any): boolean
};

export class Range {

  props: RangeProps;

  constructor(props: RangeProps) {
    this.props = props;
  }

  map<T>(fn: (any) => T) : T[] {
    return this.props.map(fn);
  }

  includes(val: any) : boolean {

    if (val === null) {
      return null;
    }

    return this.props.includes(val);
  }

  get start() {
    return this.props.start;
  }

  get 'start included'() {
    return this.props['start included'];
  }

  get end() {
    return this.props.end;
  }

  get 'end included'() {
    return this.props['end included'];
  }

}