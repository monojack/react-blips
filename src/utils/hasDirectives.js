export function hasDirectives (names, node) {
  return node.directives.some(({ name: { value, }, }) => names.includes(value))
}
