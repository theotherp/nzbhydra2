var gulp = require('gulp');
var sort = require('gulp-sort');
var wiredep = require('wiredep');
var angularFilesort = require('gulp-angular-filesort');
var ngAnnotate = require('gulp-ng-annotate');
var merge = require('merge-stream');
var less = require('gulp-less');
var livereload = require('gulp-livereload');
var concat = require('gulp-concat');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');
var git = require('gulp-git');
var runSequence = require('run-sequence');
var cleancss = require('gulp-clean-css');
var cached = require('gulp-cached');
var angularTemplateCache = require('gulp-angular-templatecache');
var argv = require('yargs').argv;
var log = require('fancy-log');


var staticFolder = argv.static === undefined ? 'src/main/resources/static' : argv.static;

gulp.task('vendor-scripts', function () {
    var dest = staticFolder + '/js';
    //Jquery must be loaded before angular for the bootstrap-switch to work
    return gulp.src(wiredep(
        {overrides: {
                "angular": {
                    "dependencies": {
                        "jquery": "1.x"
                    }
                }
            }}
    ).js)
        .pipe(cached("vendor-scripts"))
        .pipe(sourcemaps.init())
        .pipe(concat('alllibs.js'))
        .pipe(uglify())
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest(dest));
});

gulp.task('vendor-css', function () {
    var dest = staticFolder + '/css';
    return merge(
        gulp.src(wiredep().css)
            .pipe(sort())
            .pipe(cached("vendor-css")),
        gulp.src(wiredep().less)
            .pipe(sort())
            .pipe(cached("vendor-less"))
            .pipe(less())
    )
        .pipe(cached("vendor-less-and-css"))
        .pipe(sourcemaps.init())
        .pipe(concat('alllibs.css'))
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));
});


gulp.task('templates', function () {
    return gulp.src('ui-src/html/**/*.html')
    //.pipe(cached("templates")) //Doesn't work properly, will only contain last updated file
        .pipe(angularTemplateCache("templates.js", {root: "static/html/"}))
        .pipe(concat('templates.js'))
        .pipe(gulp.dest(staticFolder + '/js'));
});

gulp.task('scripts', function () {
    var dest = staticFolder + '/js';
    return gulp.src("ui-src/js/**/*.js")
        .pipe(angularFilesort())
        .on('error', swallowError)
        .pipe(ngAnnotate())
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .on('error', swallowError)
        .pipe(concat('nzbhydra.js'))
        //.pipe(uglify()) //Will cause errors
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest(dest));

});

gulp.task('less', function () {
    var dest = staticFolder + '/css';
    var brightTheme = gulp.src('ui-src/less/bright.less')
        .pipe(cached("bright"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less())
        .on('error', swallowError)
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var greyTheme = gulp.src('ui-src/less/grey.less')
        .pipe(cached("grey"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less())
        .on('error', swallowError)
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var darkTheme = gulp.src('ui-src/less/dark.less')
        .pipe(cached("dark"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less())
        .on('error', swallowError)
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    return merge(brightTheme, greyTheme, darkTheme);
});

gulp.task('copy-assets', function () {
    var fontDest = staticFolder + '/fonts';
    var fonts1 = gulp.src("bower_components/bootstrap/fonts/*")
        .pipe(cached("fonts1"))
        .pipe(gulp.dest(fontDest));

    var fonts2 = gulp.src("bower_components/font-awesome/fonts/*")
        .pipe(cached("fonts2"))
        .pipe(gulp.dest(fontDest));

    var imgDest = staticFolder + '/img';
    var img = gulp.src("ui-src/img/**/*")
        .pipe(cached("images"))
        .pipe(gulp.dest(imgDest));

    var favIcon = gulp.src("ui-src/img/**/favicon.ico")
        .pipe(cached("favicon"))
        .pipe(gulp.dest(staticFolder));

    return merge(img, fonts1, fonts2, favIcon);
});


gulp.task('add', function () {
    return gulp.src(staticFolder + '/*')
        .pipe(cached("add"))
        .pipe(git.add({args: '--all'}));
});


gulp.task('reload', function () {
    livereload();
});

gulp.task('delMainLessCache', function () {
    delete cached.caches["bright"];
    delete cached.caches["grey"];
    delete cached.caches["dark"];
});

gulp.task('copyStaticToClasses', function () {
    return gulp.src(staticFolder + '/**/*')
        .pipe(cached("copyStatic"))
        .pipe(gulp.dest('target/classes/static'));
});

gulp.task('index', function () {
    runSequence(
        ['scripts', 'less', 'templates', 'vendor-scripts', 'vendor-css', 'copy-assets'],
        ['copyStaticToClasses', 'add']
    );
});

function swallowError(error) {
    console.log(error);
    this.emit('end');
}


gulp.task('default', function () {
    //livereload.listen();
    log("Will build files into folder '" + staticFolder + "'");
    gulp.watch(['ui-src/less/nzbhydra.less'], ['delMainLessCache']);
    gulp.watch(['ui-src/**/*'], ['index']);
});