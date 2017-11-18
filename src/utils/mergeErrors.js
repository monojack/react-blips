export function mergeErrors (errors) {
  return (object = {}) => {
    return errors.reduce((obj, err) => {
      const operationName = err.path[0] || 'schema'
      return {
        ...object,
        [operationName]: [ ...(obj[operationName] || []), err, ],
      }
    }, object)
  }
}
