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

// TODO: subscribe to store only if we have queries
export default (...args) => BaseComponent => {
  invariant(
    typeof BaseComponent === 'function',
    `You must pass a component to the function returned by blips. Instead received ${JSON.stringify(BaseComponent)}`
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
      this.variables = this.computeVariables(props)
    }

    state = {
      [config.name || 'data']: {
        loading: true,
      },
    }

    promiseRegistry = []
    subscriptionRegistry = []

    componentWillMount () {
      this.resolve(literals)
    }

    componentWillReceiveProps (nextProps) {
      const nextVariables = this.computeVariables(nextProps)
      if (shallowEqual(this.variables, nextVariables)) return

      this.variables = { ...nextVariables, }

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

    computeVariables = (props = this.props) => {
      const { variables, } =
        config.options && typeof config.options === 'function' ? config.options(props) : config.options || {}
      return variables || {}
    }

    batchUpdateState = list => {
      const dataKey = isNil(config.name) ? 'data' : config.name
      const errorList = []
      const update = list.reduce(
        (acc, { errors, data, mutations, queries, }) => {
          errors && errorList.push(errors)
          return {
            ...acc,
            [dataKey]: merge(acc[dataKey], data),
            mutations,
            queries,
          }
        },
        { [dataKey]: { loading: false, }, }
      )
      !isEmpty(errorList) && (update[dataKey].errors = errorList)
      this.setState(update)
    }

    resolve = (literals, props = this.props) => {
      let cancel = false
      const { query: queries = [], mutation: mutations = [], subscription: subscriptions = [], } = literals
        .map(parse)
        .reduce((acc, ast) => {
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

      const variables = this.variables

      for (const query of queries) {
        this.query(query)({ variables, })
      }

      for (const subscription of subscriptions) {
        this.subscribe(subscription)({ variables, })
      }

      this.registerPromise(
        Promise.resolve({
          mutations: mutations.reduce((acc, mutation) => {
            return {
              ...acc,
              [getName(mutation)]: this.query(mutation),
            }
          }, {}),
          queries: queries.reduce((acc, query) => {
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

    query = (documentAST, operationName) => ({ variables, }) => {
      this.registerPromise(this.store.query(documentAST, variables, operationName))
    }

    mutate = (documentAST, operationName) => ({ variables, }) => {
      this.store.mutate(documentAST, variables, operationName)
    }

    subscribe = (documentAST, operationName) => ({ variables, }) => {
      this.store.subscribe(documentAST, variables).then(stream => {
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
