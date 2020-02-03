
export function is(el: any, type: string): boolean {

  switch (type) {
  case 'Boolean': return typeof el === 'boolean';
  case 'Number': return typeof el === 'number';

  default: return false;
  }
}