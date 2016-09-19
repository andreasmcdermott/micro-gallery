import gulp from 'gulp'
import babel from 'gulp-babel'
import cached from 'gulp-cached'
import chmod from 'gulp-chmod'
import stylus from 'gulp-stylus'

gulp.task('js', () => 
  gulp.src('./bin/*.js')
  .pipe(cached('bin'))
  .pipe(babel())
  .pipe(chmod(755))
  .pipe(gulp.dest('./dist/bin')))

gulp.task('stylus', () =>
  gulp.src('./assets/*.styl')
  .pipe(stylus())
  .pipe(gulp.dest('./dist/assets')))

gulp.task('watch-js', () => {
  gulp.watch('./bin/*.js', ['js'])
})

gulp.task('watch-stylus', () => {
  gulp.watch('./assets/*.styl', ['stylus'])
})

gulp.task('watch', ['watch-js', 'watch-stylus'])
gulp.task('build', ['js', 'stylus'])

gulp.task('default', ['build', 'watch'])