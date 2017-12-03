export function rejectDirectives (names, node) {
  return node.directives.filter(({ name: { value, }, }) => !names.includes(value))
}
