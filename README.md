# React-Blips

Official React bindings for [**Blips**](https://github.com/monojack/blips)

[![build status](https://travis-ci.org/monojack/react-blips.svg?branch=master)](https://travis-ci.org/monojack/react-blips)
[![npm version](https://img.shields.io/npm/v/react-blips.svg)](https://www.npmjs.com/package/react-blips)
[![npm downloads](https://img.shields.io/npm/dm/react-blips.svg)](https://www.npmjs.com/package/react-blips)

## Table of contents:

* [Installation](#installation)
* [Usage](#usage)
  * [The **Provider** instance](#the-provider-instance)
  * [Connect components with **graphql**](#connect-components-with-graphql)
  * [The `config` object](#the-config-object)
  * [The `data` prop](#the-data-prop)
  * [The `queries` prop](#the-queries-prop)
  * [The `mutations` prop](#the-mutations-prop)
  * [Subscribing to store changes](#subscribing-to-store-changes)
* [Tips](#tips)
* [Examples](https://github.com/monojack/blips/tree/master/examples)

## Installation

```bash
npm i react-blips
```

This assumes you are using **npm** and have already installed
[**blips**](https://www.npmjs.com/package/blips) and
[**graphql**](https://www.npmjs.com/package/graphql)

## Usage

#### The `Provider` instance

To get started you'll have to
[create the store](https://github.com/monojack/blips#creating-the-store) and pass it as a prop to
the `Provider` component

```js
import { createStore } from 'blips'
import { Provider } from 'react-blips'
// ...

const store = createStore(/* ... */)

ReactDOM.render(
  <Provider {...{ store }}>
    <App />
  </Provider>,
  document.getElementById('root')
)
```

#### Connect components with `graphql`

`graphql` is the function that creates container components which are connected to the store.

`graphql(...operations [, config])(BaseComponent)`

```js
// ...
import { graphql } from 'react-blips'

const TodoList = ({ data: { allTodos = [] } }) => (
  <ul className="todo-list">
    {allTodos.map(todo => (
      <li key={todo.id}>
        <label>
          <input type="checkbox" checked={todo.completed} />
          {todo.label}
        </label>
      </li>
    ))}
  </ul>
)

const allTodosQuery = `
  query allTodosQuery {
    allTodos {
      id
      label
      completed
    }
  }
`

export default graphql(allTodosQuery)(TodoList)
```

You can add as many operations as you need, the only requirement is that if you provide a `config`
object, it must be the last argument.

```js
// ...
const config = { ... }

export default graphql(allTodosQuery, allUsersQuery, config)(TodoList)
```

By default, the result of your queries will be added to the component's props under the `data` key:

```js
props: {
  data: {
    allTodos: [...],
    allUsers: [...]
  }
}
```

#### The `data` prop

In addition to the fields you query, the `data` prop may also contain a `loading` flag and/or an
`errors` object

##### `loading`

Indicates whether or not the operations are still executing.

```js
props: {
  data: {
    loading: true
  }
}
```

While loading, the fields you've queried may not be part of the `data`. Make sure to add some
default values or display a loader until the operations finish executing.

```js
// default values:

const TodoList = ({ data: { allTodos = [] } }) => (
  <ul className="todo-list">{allTodos.map(todo => <li>{todo}</li>)}</ul>
)

// displaying loader while operations is executing

const TodoList = ({ data: { loading, allTodos } }) => {
  return loading ? (
    <LoadingSpinner />
  ) : (
    <ul className="todo-list">{allTodos.map(todo => <li>{todo}</li>)}</ul>
  )
}
```

##### `error`

Contains all the errors that might have resulted from any of the operations.

```js
props: {
  data: {
    loading: false,
    allTodos: [...],
    errors: {
      allUsers: { ... }
    }
  }
}
```

You should always have some sort of error-handling in place, this is generally a good practice, not
only when using **Blips**.

#### The `config` object

`graphql` accepts an optional argument which represents the configuration object. This argument
should always be provided last, after all operations.

```js
graphql(...operations, config)(BaseComponent)
```

##### config.name

This property allows you to change the name of the `data` prop that gets passed down to your
component.

```js
graphql(...operations, { name: 'state' })(BaseComponent)

// props :{
//   ...
//   state: {
//     loading: false,
//     allTodos: [...],
//     allUsers: [...]
//   }
// }
```

You can also define `config.name` as a plain object if you wish to provide custom names for the
other props ([queries](#the-queries-prop), [mutations](#the-mutations-prop)) that `graphql` adds to
the container component

```js
graphql(...operations, {
  name: {
    data: 'state',
    queries: 'geters',
    mutations: 'setters',
  },
})(BaseComponent)

// props :{
//   ...
//   state: { ... },
//   getters: { ... },
//   setters: { ... }
// }
```

##### config.options

This property is an object or function that allows you to provide the variables needed for your
operations or to extend the context of the resolvers they will call.

```js
// resolvers.js
const resolvers = {
  // ...
  Query: {
    // returns only todos of the logged user
    allTodosQuery: (obj, { first }, { store, user }) => {
      store.get('todos', { user_id: user.id }).slice(0, first)
    },
  },
}

// TodoList.js
const TodoList = ({ data: { allTodos = [] } }) => (
  <ul className="todo-list">{allTodos.map(todo => <li>{todo}</li>)}</ul>
)

const allTodosQuery = `
  query allTodosQuery($first: Int) {
    allTodos(first: $first) {
      id
      label
      completed
    }
  }
`

export default graphql(allTodosQuery, {
  options: {
    variables: { first: 10 },
    context: { user: localStorage.getItem('currentUser') },
  },
})
```

You can define `config.options` as a plain object, or as a function that takes the component’s props
as an argument and returns the object.

```js
export default graphql(allTodosQuery, {
  options: props => ({
    variables: { first: props.count },
    context: { user: props.user },
  }),
})
```

#### The `queries` prop

In addition to `data`, the connected component will also receive a `queries` prop which contains all
the query operations specified, as methods that you can call manually.

```js
// ...

onUserSelect = async id => {
  const { queries: { allTodos, user }, count, user } = this.props
  const newUser = await user({ variables: { id } })
  const data = await allTodos({ variables: { first: count }, context: { user: newUser } })

  this.setState({
    todos: data.allTodos,
  })
}

// ...

render() {
  return (
    <div>
      <select onChange={e => this.onUserSelect(e.target.value)}>
        <option value="600cba27-e8fe-413b-96bc-a9cbf6a2c897">John Doe</option>
        <option value="203d7785-14c4-4fa9-8436-b49351f5b6e5">Jane Doe</option>
      </select>
      <TodoList todos={this.state.todos} />
    </div>
  )
}
```

This is great for the above type of behaviour, but you can also use these queries to poll the store
at a specific interval and update the component's state. The problem with this approach is that
you'd have to add the props you want to poll for to the state so that your component updates
correctly. If this is what you want, you're better off using
[`subscription`](#subscribing-to-store-changes) instead of `query`

#### The `mutations` prop

Another prop passed down to the container component is `mutations`. This prop contains all the
mutations you provide to `graphql()`

```js
class Todos extends Component {
  // ...

  onKeyUp = e => {
    const { mutations: { createTodo = () => {} }, data: { allTodos = [] } } = this.props

    createTodo({ variables: { label: e.target.value } })
    // adds the new todo to the store and our subscription will handle the component update
  }

  // ...

  render() {
    const { data: { allTodos = [] } } = this.props

    return (
      <div>
        <input type="text" onKeyUp={this.onKeyUp} />
        <TodoList todos={allTodos} />
      </div>
    )
  }
}

const createTodoMutation = `
  mutation createTodoMutation(id: String, label: String!, completed: Boolean) {
    createTodo {
      id
      label
      completed
    }
  }
`

export default graphql(allTodosSubscription, createTodoMutation, {
  options: {
    context: { user: localStorage.getItem('currentUser') },
  },
})
```

#### Subscribing to store changes

If you provide subscription operations to `graphql()`, the connected component will also subscribe
to store changes and will update correctly. It will also clean up after itself when unmounting.
There's no magic happening behind the scenes, you'll still have to write the resolvers yourself.
Read the [**Blips** documentation](https://github.com/monojack/blips#subscriptions) about writing
resolvers for subscriptions

```js
const allTodosSubscription = `
  subscription allTodosSubscription {
    allTodos {
      id
      label
      completed
    }
  }
`

export default graphql(allTodosSubscription)(TodoList)
```

## Tips

See [**Blips** documentation](https://github.com/monojack/blips#the-tips) to read about tips
