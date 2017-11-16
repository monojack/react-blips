import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import uglify from 'rollup-plugin-uglify'
import analyze from 'rollup-analyzer-plugin'

const opts = { limit: 5, filter: [], root: __dirname, }

const env = process.env.NODE_ENV

const config = {
  input: 'src/index.js',
  external: [ 'react', 'blips', ],
  globals: {
    react: 'React',
    blips: 'blips',
  },
  output: {
    format: 'umd',
  },
  name: 'blips',
  sourcemap: true,
  plugins: [
    resolve(),
    babel({
      exclude: '**/node_modules/**',
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
    }),
    commonjs({
      namedExports: {
        'graphql': [ 'parse', 'visit', ],
      },
    }),
    analyze(opts),
  ],
}

if (env === 'production') {
  config.plugins.push(
    uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false,
      },
    })
  )
}

export default config
