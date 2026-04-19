//Expected file structure:
//Folder with this file contains the folders ui-src and bower_components

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
var terser = require('gulp-terser');
var runSequence = require('run-sequence');
var cleancss = require('gulp-clean-css');
var cached = require('gulp-cached');
var angularTemplateCache = require('gulp-angular-templatecache');
var argv = require('yargs').argv;
var log = require('fancy-log');


var liveReloadActive = false;

var staticFolder = process.env.STATIC_FOLDER || 'src/main/resources/static';
var uiSrcFolder = process.env.UI_SRC_FOLDER || 'ui-src';
var classesStaticFolder = process.env.CLASSES_STATIC_FOLDER || 'target/classes/static';

gulp.task('vendor-scripts', function () {
    var dest = staticFolder + '/js';
    //Jquery must be loaded before angular for the bootstrap-switch to work
    return gulp.src(wiredep(
        {
            overrides: {
                "angular": {
                    "dependencies": {
                        "jquery": "1.x"
                    }
                }
                , "angular-formly": {
                    "dependencies": {
                        "angular": "*",
                        "api-check": "*"
                    }
                }
                , "moment-timezone": {
                    "main": "builds/moment-timezone-with-data-1970-2030.js"
                }
            }
        }
    ).js)
        .pipe(cached("vendor-scripts"))
        .pipe(sourcemaps.init())
        .pipe(concat('alllibs.js'))
        .pipe(terser())
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest(dest));
});

gulp.task('vendor-scripts-dev', function () {
    var dest = staticFolder + '/js';
    //Jquery must be loaded before angular for the bootstrap-switch to work
    return gulp.src(wiredep(
        {
            overrides: {
                "angular": {
                    "dependencies": {
                        "jquery": "1.x"
                    }
                }
                , "angular-formly": {
                    "dependencies": {
                        "angular": "*",
                        "api-check": "*"
                    }
                }
                , "moment-timezone": {
                    "main": "builds/moment-timezone-with-data-1970-2030.js"
                }
            }
        }
    ).js)
        .pipe(cached("vendor-scripts-dev"))
        .pipe(sourcemaps.init())
        .pipe(concat('alllibs.js'))
        .pipe(sourcemaps.write("./"))
        .pipe(gulp.dest(dest));
});

gulp.task('vendor-css', function () {
    var dest = staticFolder + '/css';
    return merge(
        gulp.src(wiredep({
            exclude: [
                "bower_components/bootstrap/",
                "bower_components/bootstrap-switch/"
            ]
        }).css)
            .pipe(sort())
            .pipe(cached("vendor-css")),
        gulp.src(wiredep(
            {
                exclude: [
                    "bower_components/bootstrap/",
                    "bower_components/bootstrap-switch/"
                ]
            }
        ).less)
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

gulp.task('vendor-css-dev', function () {
    var dest = staticFolder + '/css';
    return merge(
        gulp.src(wiredep({
            exclude: [
                "bower_components/bootstrap/",
                "bower_components/bootstrap-switch/"
            ]
        }).css)
            .pipe(sort())
            .pipe(cached("vendor-css-dev")),
        gulp.src(wiredep(
            {
                exclude: [
                    "bower_components/bootstrap/",
                    "bower_components/bootstrap-switch/"
                ]
            }
        ).less)
            .pipe(sort())
            .pipe(cached("vendor-less-dev"))
            .pipe(less())
    )
        .pipe(cached("vendor-less-and-css-dev"))
        .pipe(sourcemaps.init())
        .pipe(concat('alllibs.css'))
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));
});


gulp.task('templates', function () {
    return gulp.src(uiSrcFolder + '/html/**/*.html')
        //.pipe(cached("templates")) //Doesn't work properly, will only contain last updated file
        .pipe(sort())
        .pipe(angularTemplateCache("templates.js", {root: "static/html/"}))
        .pipe(concat('templates.js'))
        .pipe(gulp.dest(staticFolder + '/js'));
});

gulp.task('scripts', function () {
    var dest = staticFolder + '/js';
    return gulp.src(uiSrcFolder + "/js/**/*.js")
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
    var brightTheme = gulp.src(uiSrcFolder + '/less/bright.less')
        .pipe(cached("bright"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var greyTheme = gulp.src(uiSrcFolder + '/less/grey.less')
        .pipe(cached("grey"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var darkTheme = gulp.src(uiSrcFolder + '/less/dark.less')
        .pipe(cached("dark"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var autoTheme = gulp.src(uiSrcFolder + '/less/auto.less')
        .pipe(cached("auto"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(cleancss())
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    return merge(brightTheme, greyTheme, darkTheme, autoTheme);
});

gulp.task('less-dev', function () {
    var dest = staticFolder + '/css';
    var brightTheme = gulp.src(uiSrcFolder + '/less/bright.less')
        .pipe(cached("bright-dev"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var greyTheme = gulp.src(uiSrcFolder + '/less/grey.less')
        .pipe(cached("grey-dev"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var darkTheme = gulp.src(uiSrcFolder + '/less/dark.less')
        .pipe(cached("dark-dev"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    var autoTheme = gulp.src(uiSrcFolder + '/less/auto.less')
        .pipe(cached("auto-dev"))
        .on('error', swallowError)
        .pipe(sourcemaps.init())
        .pipe(less({
            relativeUrls: true
        }))
        .on('error', swallowError)
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(dest));

    return merge(brightTheme, greyTheme, darkTheme, autoTheme);
});

gulp.task('copy-assets', function () {
    var fontDest = staticFolder + '/fonts';
    var fonts1 = gulp.src("bower_components/bootstrap/fonts/*")
        .pipe(cached("fonts1"))
        .pipe(gulp.dest(fontDest));

    var fonts2 = gulp.src("bower_components/font-awesome/fonts/*")
        .pipe(cached("fonts2"))
        .pipe(gulp.dest(fontDest));

    var fonts3 = gulp.src("bower_components/bootstrap-less/fonts/*")
        .pipe(cached("fonts3"))
        .pipe(gulp.dest(fontDest));

    var imgDest = staticFolder + '/img';
    var img = gulp.src(uiSrcFolder + "/img/**/*")
        .pipe(cached("images"))
        .pipe(gulp.dest(imgDest));

    var favIcon = gulp.src(uiSrcFolder + "/img/**/favicon.ico")
        .pipe(cached("favicon"))
        .pipe(gulp.dest(staticFolder));

    return merge(img, fonts1, fonts2, fonts3, favIcon);
});


gulp.task('reload', function () {
    if (liveReloadActive) {
        livereload.reload();
        log("Triggering live reload")
    }
});

gulp.task('delMainLessCache', function () {
    delete cached.caches["bright"];
    delete cached.caches["grey"];
    delete cached.caches["dark"];
    delete cached.caches["auto"];
    delete cached.caches["bright-dev"];
    delete cached.caches["grey-dev"];
    delete cached.caches["dark-dev"];
    delete cached.caches["auto-dev"];
});

gulp.task('copyStaticToClasses', function () {
    return gulp.src(staticFolder + '/**/*')
        .pipe(gulp.dest(classesStaticFolder));
});

gulp.task('styles-dev', function () {
    runSequence(
        ['delMainLessCache'],
        ['less-dev'],
        ['copyStaticToClasses'],
        ['reload']
    );
});

gulp.task('templates-dev', function () {
    runSequence(
        ['templates'],
        ['copyStaticToClasses'],
        ['reload']
    );
});

gulp.task('scripts-dev-only', function () {
    runSequence(
        ['scripts'],
        ['copyStaticToClasses'],
        ['reload']
    );
});

gulp.task('assets-dev', function () {
    runSequence(
        ['copy-assets'],
        ['copyStaticToClasses'],
        ['reload']
    );
});

gulp.task('index', function () {
    log("Will build from '" + uiSrcFolder + "'");
    log("Will build files into folder '" + staticFolder + "'");
    runSequence(
        ['scripts', 'less', 'templates', 'vendor-scripts', 'vendor-css', 'copy-assets'],
        ['copyStaticToClasses'],
        ['reload']
    );
});

gulp.task('index-dev', function () {
    log("Will build from '" + uiSrcFolder + "'");
    log("Will build files into folder '" + staticFolder + "'");
    runSequence(
        ['scripts', 'less-dev', 'templates', 'vendor-scripts-dev', 'vendor-css-dev', 'copy-assets'],
        ['copyStaticToClasses'],
        ['reload']
    );
});

function swallowError(error) {
    console.log(error);
    this.emit('end');
}


gulp.task('default', function () {
    log("Starting livereload server on port 1234")
    livereload.listen({"port": 1234});
    liveReloadActive = true;
    log("Will watch '" + uiSrcFolder + "'");
    log("Will build files into folder '" + staticFolder + "'");
    log("Will copy static files into '" + classesStaticFolder + "'");
    runSequence(["index-dev"]);
    gulp.watch([uiSrcFolder + '/less/**/*.less'], ['styles-dev']);
    gulp.watch([uiSrcFolder + '/html/**/*.html'], ['templates-dev']);
    gulp.watch([uiSrcFolder + '/js/**/*.js', '!' + uiSrcFolder + '/hydra-ng/**'], ['scripts-dev-only']);
    gulp.watch([uiSrcFolder + '/img/**/*'], ['assets-dev']);
    gulp.watch([uiSrcFolder + '/img/**/favicon.ico'], ['assets-dev']);
});
