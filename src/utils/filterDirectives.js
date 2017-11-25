export function filterDirectives (names, document) {
  return document.directives.filter(
    ({ name: { value, }, }) => !names.includes(value)
  )
}
