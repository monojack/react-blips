import React, { Component, } from 'react'
import PropTypes from 'prop-types'
import { parse, visit, } from 'graphql'

import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'

import isNil from 'lodash/isNil'
import isEmpty from 'lodash/isEmpty'
import merge from 'lodash/merge'
import get from 'lodash/get'

import { shallowEqual, } from '../utils'

const getName = op => get(op, [ 'definitions', 0, 'name', 'value', ])

const getPropName = key => config => {
  let name = key

  if (!isNil(config.name)) {
    if (typeof config.name === 'object') {
      name = config.name[key] || key
    } else if (typeof config.name === 'string') {
      name = key === 'data' ? config.name : key
    }
  }

  return name
}

const mergeErrors = errors => (object = {}) => {
  return errors.reduce((obj, err) => {
    const operationName = err.path[0]
    return {
      ...object,
      [operationName]: [ ...(obj[operationName] || []), err, ],
    }
  }, object)
}

// TODO: subscribe to store only if we have queries
export default (...args) => BaseComponent => {
  invariant(
    typeof BaseComponent === 'function',
    `You must pass a component to the function returned by blips. Instead received ${JSON.stringify(
      BaseComponent
    )}`
  )

  let config = {}

  if (typeof args[args.length - 1] === 'object') {
    config = args.pop()
  }
  const literals = [ ...args, ]

  class blips extends Component {
    static displayName = `Blips(${BaseComponent.displayName || BaseComponent.name || 'Component'})`

    static WrappedComponent = BaseComponent

    static contextTypes = {
      store: PropTypes.object.isRequired,
    }

    constructor (props, context) {
      super(props, context)

      this.store = context.store
      this.options = this.computeOptions(props)
    }

    state = {
      [getPropName('data')(config)]: {
        loading: true,
      },
    }

    promiseRegistry = []
    subscriptionRegistry = []

    componentWillMount () {
      this.resolve(literals)
    }

    componentWillReceiveProps (nextProps) {
      const nextOptions = this.computeOptions(nextProps)

      if (shallowEqual(this.options, nextOptions)) return

      this.options = { ...nextOptions, }

      this.cancelSubscriptions()
      this.subscriptionRegistry = []
      this.cancelResolve()
      this.promiseRegistry = []

      this.resolve(literals, nextProps)
    }

    cancelResolve = () => {}

    cancelSubscriptions = () => {
      for (const sub of this.subscriptionRegistry) {
        sub.unsubscribe()
      }
    }

    registerPromise = promise => this.promiseRegistry.push(promise)

    clearPromiseRegistry = () => (this.promiseRegistry = [])

    convertSubToQuery = ast => {
      return visit(ast, {
        leave (node, key, parent, path, ancestors) {
          return node.kind === 'OperationDefinition' && node.operation === 'subscription'
            ? {
              ...node,
              operation: 'query',
            }
            : node
        },
      })
    }

    computeOptions = (props = this.props) =>
      config.options && typeof config.options === 'function'
        ? config.options(props)
        : config.options || {}

    batchUpdateState = list => {
      const dataKey = getPropName('data')(config)
      const mutationsKey = getPropName('mutations')(config)
      const queriesKey = getPropName('queries')(config)

      let errorsObject = {}
      const update = list.reduce(
        (acc, { errors, data, ...res }) => {
          errors && (errorsObject = mergeErrors(errors)(errorsObject))
          return {
            ...acc,
            [dataKey]: merge(acc[dataKey], isNil(errors) ? data : {}),
            [mutationsKey]: res[mutationsKey],
            [queriesKey]: res[queriesKey],
          }
        },
        { [dataKey]: { loading: false, }, }
      )
      !isEmpty(errorsObject) && (update[dataKey].errors = errorsObject)
      this.setState(update)
    }

    resolve = (literals, props = this.props) => {
      let cancel = false
      const {
        query: queries = [],
        mutation: mutations = [],
        subscription: subscriptions = [],
      } = literals.map(parse).reduce((acc, ast) => {
        const operation = ast.definitions[0].operation
        const queryASTFromSub = operation === 'subscription' ? this.convertSubToQuery(ast) : null

        return {
          ...acc,
          ...(queryASTFromSub
            ? {
              query: [ ...(acc['query'] || []), queryASTFromSub, ],
            }
            : {}),
          [operation]: [ ...(acc[operation] || []), ast, ],
        }
      }, {})

      for (const query of queries) {
        this.query(query)(this.options)
      }

      for (const subscription of subscriptions) {
        this.subscribe(subscription)(this.options)
      }

      this.registerPromise(
        Promise.resolve({
          [getPropName('mutations')(config)]: mutations.reduce((acc, mutation) => {
            return {
              ...acc,
              [getName(mutation)]: this.query(mutation),
            }
          }, {}),
          [getPropName('queries')(config)]: queries.reduce((acc, query) => {
            return {
              ...acc,
              [getName(query)]: this.query(query),
            }
          }, {}),
        })
      )

      Promise.all(this.promiseRegistry).then(res => {
        !cancel && this.batchUpdateState(res)
      })

      this.cancelResolve = () => (cancel = true)
    }

    query = (documentAST, operationName) => options => {
      const promise = this.store.query(documentAST, options, operationName)
      this.registerPromise(promise)
      return promise
    }

    mutate = (documentAST, operationName) => options => {
      return this.store.mutate(documentAST, options, operationName)
    }

    subscribe = (documentAST, operationName) => options => {
      this.store.subscribe(documentAST, options, operationName).then(stream => {
        const sub = stream.subscribe(tick => {
          this.setState({
            [config.name || 'data']: {
              ...this.state[config.name || 'data'],
              ...tick.data,
              loading: false,
            },
          })
        })
        this.subscriptionRegistry.push(sub)
      })
    }

    render () {
      const props = { ...this.props, ...this.state, }
      return <BaseComponent {...props} />
    }
  }

  return hoistNonReactStatics(blips, BaseComponent, {})
}
