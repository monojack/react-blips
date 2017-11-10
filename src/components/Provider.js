import { Component, Children, } from 'react'
import PropTypes from 'prop-types'

export default class Provider extends Component {
  static propTypes = {
    store: PropTypes.shape({
      state: PropTypes.object.isRequired,
      schema: PropTypes.object.isRequired,
      query: PropTypes.func.isRequired,
      mutate: PropTypes.func.isRequired,
      subscribe: PropTypes.func.isRequired,
    }).isRequired,
    children: PropTypes.element.isRequired,
  }

  static childContextTypes = {
    store: PropTypes.object.isRequired,
  }

  getChildContext () {
    return { store: this.store, }
  }

  constructor (props, context) {
    super(props, context)
    this.store = props.store
  }

  render () {
    return Children.only(this.props.children)
  }
}
