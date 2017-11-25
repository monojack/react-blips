import React, { Component, } from 'react'
import PropTypes from 'prop-types'
import { parse, } from 'graphql'

import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'

import {
  shallowEqual,
  getPropNameOr,
  getOperationASTs,
  getFragmentASTs,
  getOperationName,
  makeExecutableOperation,
} from '../utils'

export function createWithOperationsHoc (sources, config) {
  const mutationsKey = getPropNameOr('mutations')(config)
  const queriesKey = getPropNameOr('queries')(config)

  const computeOptions = props =>
    config.options && typeof config.options === 'function'
      ? config.options(props)
      : config.options || {}

  return function withOperations (BaseComponent) {
    invariant(
      typeof BaseComponent === 'function',
      `You must pass a component to the function returned by blips. Instead received ${JSON.stringify(
        BaseComponent
      )}`
    )

    class WithOperations extends Component {
      static displayName = `withOperations(${BaseComponent.displayName ||
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

      componentWillMount () {
        this.resolve()
      }

      componentWillReceiveProps (nextProps) {
        const nextOptions = computeOptions(nextProps)

        if (shallowEqual(this.options, nextOptions)) return

        this.options = { ...nextOptions, }

        this.resolve()
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
        const {
          asts: { query: queries = [], mutation: mutations = [], fragments, },
        } = this.parsedData

        const queryOperations = queries.reduce((acc, curr) => {
          return {
            ...acc,
            [getOperationName(curr)]: makeExecutableOperation.call(
              this,
              curr,
              fragments
            ),
          }
        }, {})

        const mutationOperations = mutations.reduce((acc, curr) => {
          return {
            ...acc,
            [getOperationName(curr)]: makeExecutableOperation.call(
              this,
              curr,
              fragments
            ),
          }
        }, {})

        this.operations = {
          [queriesKey]: queryOperations,
          [mutationsKey]: mutationOperations,
        }
      }

      query = source => (options = this.options) => {
        return this.store.query(source, options)
      }

      mutate = source => (options = this.options) => {
        return this.store.mutate(source, options)
      }

      graphql = source => (options = this.options) => {
        return this.store.graphql(source, options)
      }

      render () {
        const props = Object.entries(this.operations).reduce(
          (acc, [ key, value, ]) => ({
            ...acc,
            [key]: {
              ...(acc[key] || {}),
              ...value,
            },
          }),
          this.props
        )

        return <BaseComponent {...props} />
      }
    }

    return hoistNonReactStatics(WithOperations, BaseComponent, {})
  }
}
