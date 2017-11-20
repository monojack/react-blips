import { visit, Kind, } from 'graphql'

export function getRequiredFragments (ast) {
  const fragments = []

  visit(ast, {
    leave ({ kind, name: { value, } = {}, }) {
      kind === Kind.FRAGMENT_SPREAD && fragments.push(value)
    },
  })

  return fragments
}
