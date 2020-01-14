
export function is(el, type) {

  switch (type) {
  case 'Boolean': return typeof el === 'boolean';
  case 'Number': return typeof el === 'number';

  default: return false;
  }
}