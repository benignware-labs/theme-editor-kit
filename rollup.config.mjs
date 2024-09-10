import terser from '@rollup/plugin-terser';

export default {
  input: 'index.mjs',
  output: [
    {
      file: 'dist/themeEditorKit.mjs',
      format: 'es'
    },
    {
      file: 'dist/themeEditorKit.min.js',
      format: 'iife',
			name: 'ThemeEditorKit',
      plugins: [terser()]
    }
  ]
};