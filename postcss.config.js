const postcssPresetEnv = require('postcss-preset-env')
const postcssImport = require('postcss-import')
const cssnano = require('cssnano')

const dev = {
  plugins: [
    postcssImport({
      path: 'css'
    }),
    postcssPresetEnv({
      stage: 0,
      features: {
        'logical-properties-and-values': false,
        'prefers-color-scheme-query': false,
        'gap-properties': false
      }
    })
  ]
}

const prod = {
  plugins: [
    postcssImport({
      path: 'css'
    }),
    postcssPresetEnv({
      stage: 0,
      features: {
        'logical-properties-and-values': false,
        'prefers-color-scheme-query': false,
        'gap-properties': false
      }
    }),
    cssnano({
      preset: 'default'
    })
  ]
}

module.exports = process.env.NODE_ENV === 'production' ? prod : dev
