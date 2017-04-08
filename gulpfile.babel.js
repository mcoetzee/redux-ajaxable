var gulp = require('gulp');
var babel = require('gulp-babel');

gulp.task('build:es', () => {
  gulp.src('src/**/*.js')
    .pipe(babel({
      babelrc: false,
      presets: [
        ['es2015', { modules: false }]
      ],
      plugins: [
        'transform-function-bind',
        'transform-object-rest-spread'
      ]
    }))
    .pipe(gulp.dest('lib/es'));
});
