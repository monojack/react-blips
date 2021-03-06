import { createGraphQLHoc, } from './createGraphQLHoc'

export default (...args) => {
  let config = {}

  if (typeof args[args.length - 1] === 'object') {
    config = args.pop()
  }
  const sources = [ ...args, ]

  return createGraphQLHoc(sources, config)
}
