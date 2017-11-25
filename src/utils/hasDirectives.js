export function hasDirectives (names, document) {
  return document.directives.some(({ name: { value, }, }) =>
    names.includes(value)
  )
}
