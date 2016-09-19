import gulp from 'gulp'
import babel from 'gulp-babel'
import cached from 'gulp-cached'
import chmod from 'gulp-chmod'

gulp.task('compile', () => 
  gulp.src('./bin/*.js')
  .pipe(cached('bin'))
  .pipe(babel())
  .pipe(chmod(755))
  .pipe(gulp.dest('./dist/bin')))

gulp.task('watch', () => {
  gulp.watch('./bin/*.js', ['compile'])
})

gulp.task('default', ['compile', 'watch'])