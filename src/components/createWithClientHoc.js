import React, { Component, } from 'react'
import PropTypes from 'prop-types'

import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'

export function createWithClientHoc (BaseComponent) {
  invariant(
    typeof BaseComponent === 'function',
    `You must pass a component to the function returned by graphql. Instead received ${JSON.stringify(
      BaseComponent
    )}`
  )

  class WithClient extends Component {
    static displayName = `withClient(${BaseComponent.displayName ||
      BaseComponent.name ||
      'Component'})`

    static WrappedComponent = BaseComponent

    static propTypes = {
      client: PropTypes.object,
    }

    static contextTypes = {
      client: PropTypes.object.isRequired,
    }

    constructor (props, context) {
      super(props, context)

      this.client = props.client || context.client
    }

    componentWillReceiveProps (nextProps) {
      if (nextProps.client && nextProps.client !== this.client) {
        this.client = nextProps.client
      }
    }

    render () {
      return <BaseComponent {...{ ...this.props, client: this.client, }} />
    }
  }

  return hoistNonReactStatics(WithClient, BaseComponent, {})
}
