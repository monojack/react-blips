import React, { Component, } from 'react'
import PropTypes from 'prop-types'
import { parse, print, concatAST, } from 'graphql'

import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'

import {
  shallowEqual,
  getPropNameOr,
  createDocumentAST,
  convertSubscriptionToQuery,
  getRequiredFragments,
  computeNextState,
  getOperationASTs,
  getFragmentASTs,
  mergeOperations,
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
        this.parsedData = this.parse(sources)
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

      parse = sources => {
        const source = sources.reduce((acc, curr) => (acc += curr), '')
        const document = parse(source)
        const asts = getOperationASTs(document).reduce(
          (acc, ast) => ({
            ...acc,
            [ast.operation]: [ ...(acc[ast.operation] || []), ast, ],
          }),
          {}
        )

        asts.query = [
          ...(asts.query || []),
          ...(asts.subscription || []).map(convertSubscriptionToQuery),
        ]

        asts.fragments = getFragmentASTs(document).reduce(
          (acc, ast) => ({
            ...acc,
            [ast.name.value]: ast,
          }),
          {}
        )

        return {
          source,
          document,
          asts,
        }
      }

      resolve = () => {
        let cancel = false
        const {
          source,
          asts: {
            query: queries = [],
            mutation: mutations = [],
            subscription: subscriptions = [],
            fragments,
          },
        } = this.parsedData

        this.query(source)(null)(this.options)

        for (const subscription of subscriptions) {
          const requiredFragments = getRequiredFragments(subscription).map(
            name => createDocumentAST(fragments[name])
          )

          const subDocument = concatAST([
            createDocumentAST(subscription),
            ...requiredFragments,
          ])

          const queryDocument = concatAST([
            ...queries.map(createDocumentAST),
            ...requiredFragments,
          ])

          this.query(print(queryDocument))(null)(this.options)
          this.subscribe(subDocument)(this.options)
        }

        registerPromise(
          Promise.resolve({
            [queriesKey]: queries.reduce(
              mergeOperations(this.query(source)),
              {}
            ),
            [mutationsKey]: mutations.reduce(
              mergeOperations(this.mutate(source)),
              {}
            ),
          })
        )

        Promise.all(promiseRegistry).then(res => {
          !cancel &&
            this.batchUpdateState(res, { data: { loading: false, }, }, true)
        })

        this.cancelResolve = () => (cancel = true)
      }

      query = source => operationName => options => {
        const promise = this.store.query(source, options, operationName)
        registerPromise(promise)
        return promise
      }

      mutate = source => operationName => options => {
        return this.store.mutate(source, options, operationName)
      }

      subscribe = document => async options => {
        const iterator = await this.store.subscribe(document, options)

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
