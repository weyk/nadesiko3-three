import replace from '@rollup/plugin-replace';

export default {
  external: "three",
  input: './tmp/js/plugin_weykthree.js',
  output: {
    file: './lib/plugin_weykthree.js',
  },
  plugins: [
    replace({
      delimiters: ['', ''],
      preventAssignment: true,
      values: {
        'import * as THREENS from \'three\';': ''
      }
    })
  ]
}
