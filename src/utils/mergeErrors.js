export function mergeErrors (errors) {
  return (object = {}) => {
    return Object.entries(errors).reduce((obj, [ type, err, ]) => {
      return {
        ...obj,
        [type]: [ ...(obj[type] || []), ...err, ],
      }
    }, object)
  }
}
