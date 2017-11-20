import { isFragmentDefinition, } from './isFragmentDefinition'

export function getFragmentASTs ({ definitions, }) {
  return definitions.filter(isFragmentDefinition)
}
