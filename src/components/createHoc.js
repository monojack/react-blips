import React, { Component, } from 'react'
import PropTypes from 'prop-types'
import { parse, print, } from 'graphql'

import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'

import {
  shallowEqual,
  getPropNameOr,
  mergeOperations,
  convertSubscriptionToQuery,
  computeNextState,
} from '../utils'

export function createHoc (sources, config) {
  const dataKey = getPropNameOr('data')(config)
  const mutationsKey = getPropNameOr('mutations')(config)
  const queriesKey = getPropNameOr('queries')(config)

  const promiseRegistry = []
  const registerPromise = promiseRegistry.push.bind(promiseRegistry)
  const clearPromiseRegistry = () => (promiseRegistry.length = 0)

  const subscriptionRegistry = []
  const registerSubscription = subscriptionRegistry.push.bind(
    subscriptionRegistry
  )
  const clearSubscriptionRegistry = () => (subscriptionRegistry.length = 0)
  const cancelSubscriptions = () => {
    for (const subscription of subscriptionRegistry) {
      subscription.unsubscribe()
    }
  }

  const updateBatch = []

  const computeOptions = props =>
    config.options && typeof config.options === 'function'
      ? config.options(props)
      : config.options || {}

  return function Blips (BaseComponent) {
    invariant(
      typeof BaseComponent === 'function',
      `You must pass a component to the function returned by blips. Instead received ${JSON.stringify(
        BaseComponent
      )}`
    )

    class blips extends Component {
      static displayName = `Blips(${BaseComponent.displayName ||
        BaseComponent.name ||
        'Component'})`

      static WrappedComponent = BaseComponent

      static contextTypes = {
        store: PropTypes.object.isRequired,
      }

      constructor (props, context) {
        super(props, context)

        this.store = context.store
        this.options = computeOptions(props)
      }

      state = {
        [dataKey]: {
          loading: true,
        },
      }

      componentWillMount () {
        this.resolve()
      }

      componentWillReceiveProps (nextProps) {
        const nextOptions = computeOptions(nextProps)

        if (shallowEqual(this.options, nextOptions)) return

        this.options = { ...nextOptions, }

        cancelSubscriptions()
        clearSubscriptionRegistry()
        clearPromiseRegistry()

        this.cancelResolve()
        this.resolve()
      }

      cancelResolve = () => {}

      batchUpdateState = (list = updateBatch, state = this.state, force) => {
        if (list.length === 0 && !force) return
        this.setState(
          computeNextState(
            list,
            {
              dataKey,
              queriesKey,
              mutationsKey,
            },
            state
          )
        )
        updateBatch.length = 0
      }

      resolve = () => {
        // console.log(sources)
        // return
        let cancel = false
        // console.log(printType(sources[0]))
        const {
          query: queries = [],
          mutation: mutations = [],
          subscription: subscriptions = [],
        } = sources.map(parse).reduce((acc, ast) => {
          const {
            query = [],
            mutation = [],
            subscription = [],
          } = ast.definitions.reduce((ops, definition) => {
            const { operation, } = definition
            return {
              ...ops,
              [operation]: [
                ...(ops[operation] || []),
                { ...ast, definitions: [ definition, ], },
              ],
            }
          }, {})

          return {
            ...acc,
            query: [ ...(acc.query || []), ...query, ],
            mutation: [ ...(acc.mutation || []), ...mutation, ],
            subscription: [ ...(acc.subscription || []), ...subscription, ],
          }
        }, {})

        for (const query of queries) {
          this.query(query)(this.options)
        }

        for (const subscription of subscriptions) {
          this.subscribe(subscription)(this.options)
        }

        registerPromise(
          Promise.resolve({
            [queriesKey]: queries.reduce(mergeOperations(this.query), {}),
            [mutationsKey]: mutations.reduce(mergeOperations(this.mutate), {}),
          })
        )

        Promise.all(promiseRegistry).then(res => {
          !cancel &&
            this.batchUpdateState(res, { data: { loading: false, }, }, true)
        })

        this.cancelResolve = () => (cancel = true)
      }

      query = (document, operationName) => options => {
        const promise = this.store.query(
          print(document),
          options,
          operationName
        )
        registerPromise(promise)
        return promise
      }

      mutate = (document, operationName) => options => {
        return this.store.mutate(print(document), options, operationName)
      }

      subscribe = (document, operationName) => async options => {
        this.query(convertSubscriptionToQuery(document))(options)

        const iterator = await this.store.subscribe(
          document,
          options,
          operationName
        )

        registerSubscription(
          iterator.toObservable().subscribe(res => {
            updateBatch.push(res)
            process.nextTick(this.batchUpdateState)
          })
        )
      }

      render () {
        const props = { ...this.props, ...this.state, }
        return <BaseComponent {...props} />
      }
    }

    return hoistNonReactStatics(blips, BaseComponent, {})
  }
}
