'use strict';
/*jshint expr: true*/
var path = require('path');
var helpers = require('yeoman-generator').test;
var _ = require('lodash');
var files = require('./helper/fileHelper');
var chai = require('chai');
var expect = chai.expect;
var fs = require('fs-extra');
var glob = require('glob');
var exec = require('child_process').exec;


// All params
// continue (true)
// symfonyStandard (true)
// framework (noframework|bootstrap|pure|foundation)
// preprocessor (nopreprocessor|less|sass|stylus)
// libsass (true|false)
// useCritical (true|false)
// loader (requirejs|jspm)
//

function linkDeps(skip) {
    return function () {
        // reset conflicted modules
        _.forEach(glob.sync(__dirname + '/fixtures/node_modules/*.conflicted'), function (conflicted) {
            fs.renameSync(conflicted, conflicted.replace(/\.conflicted$/, ''));
        });
        // rename skiped files conflicted
        _.chain(glob.sync(__dirname + '/fixtures/node_modules/*'))
            .filter(function (dir) {
                return _.indexOf(skip || [], path.basename(dir)) !== -1;
            }).forEach(function (dir) {
                fs.renameSync(dir, dir + '.conflicted');
            }).value();


        fs.symlinkSync(__dirname + '/fixtures/node_modules', __dirname + '/temp/node_modules');
        fs.symlinkSync(__dirname + '/fixtures/bower_components', __dirname + '/temp/bower_components');
        fs.symlinkSync(__dirname + '/fixtures/jspm_packages', __dirname + '/temp/jspm_packages');
    };
}


function needsComposer(cb) {
    if (!cb) {
        cb = function () {};
    }
    return function() {
        exec('php -r "readfile(\'https://getcomposer.org/installer\');" | php', function (error) {
            expect(error).to.be.null;
            fs.copySync(__dirname + '/temp/app/config/parameters.yml.dist', __dirname + '/temp/app/config/parameters.yml');
            exec('php composer.phar install', function (error, stdout) {
                expect(error).to.be.null;
                cb(error, stdout);
            });
        });
    };
}

function needsJspm(cb) {
    if (!cb) {
        cb = function () {};
    }
    return function(){
        exec('jspm install', function (error, stdout) {
            expect(error).to.be.null;
            cb(error, stdout);
        });
    };
}

function needsJspmAndComposer(cb) {
    return needsComposer(needsJspm(cb));
}


describe('grunt-symfony generator', function () {

    var defaultOptions = {
        symfonyStandard: true,
        continue: true,
        framework: 'noframework',
        preprocessor: 'nopreprocessor',
        useCritical: false,
        loader: 'requirejs'
    };

    function testConfiguration(config, precondition, conflictingModules) {
        var opts = _.assign(defaultOptions, config || {});
        if (!_.isFunction(precondition)) {
            precondition = function(cb){ return function(){cb();};};
        }
        return function () {
            before(function (done) {
                this.timeout(60000);
                helpers.run(path.join(__dirname, '../app'))
                    .inDir(__dirname + '/temp')
                    .withOptions({'skip-install': true})
                    .withPrompts(opts)
                    .on('ready', linkDeps(conflictingModules))
                    .on('end', done);
            });

            it('should create files', function (done) {
                helpers.assertFile(files(__dirname + '/temp').addLess().addRequirejs().done());
                done();
            });

            it('should pass jshint', function (done) {
                exec('grunt jshint', function (error, stdout) {
                    expect(stdout).to.contain('Done, without errors.');
                    done();
                });
            });

            it('should build assets', function (done) {
                this.timeout(100000);
                precondition(function() {
                    exec('grunt assets', function (error, stdout) {
                        expect(stdout).to.contain('Done, without errors.');
                        done();
                    });
                })();
            });
        };
    }

    describe('running app with jspm, critical and without preprocessor,framework ', testConfiguration({useCritical: true, loader: 'jspm'}, needsJspmAndComposer));

    describe('running app with jspm and without preprocessor,framework ', testConfiguration({loader: 'jspm'}, needsJspm));
    describe('running app with jspm, less and without framework ', testConfiguration({loader: 'jspm',preprocessor: 'less'}, needsJspm));
    describe('running app with jspm, sass (ruby) and without framework ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: false}, needsJspm, ['grunt-sass']));
    describe('running app with jspm, sass (node) and without framework ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: true}, needsJspm, ['grunt-contrib-sass']));
    describe('running app with jspm, stylus and without framework ', testConfiguration({loader: 'jspm',preprocessor: 'stylus'}, needsJspm));

    describe('running app with jspm, uikit and without preprocessor ', testConfiguration({loader: 'jspm'}, needsJspm));
    describe('running app with jspm, less and uikit ', testConfiguration({loader: 'jspm',preprocessor: 'less',framework: 'uikit'}, needsJspm));
    describe('running app with jspm, sass (ruby) and uikit ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: false,framework: 'uikit'}, needsJspm, ['grunt-sass']));
    describe('running app with jspm, sass (node) and uikit ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: true,framework: 'uikit'}, needsJspm, ['grunt-contrib-sass']));
    describe('running app with jspm, stylus and uikit ', testConfiguration({loader: 'jspm',preprocessor: 'stylus',framework: 'uikit'}, needsJspm));

    describe('running app with jspm, bootstrap and without preprocessor ', testConfiguration({loader: 'jspm'}, needsJspm));
    describe('running app with jspm, less and bootstrap ', testConfiguration({loader: 'jspm',preprocessor: 'less',framework: 'bootstrap'}, needsJspm));
    describe('running app with jspm, sass (ruby) and bootstrap ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: false,framework: 'bootstrap'}, needsJspm, ['grunt-sass']));
    describe('running app with jspm, sass (node) and bootstrap ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: true,framework: 'bootstrap'}, needsJspm, ['grunt-contrib-sass']));
    describe('running app with jspm, stylus and bootstrap ', testConfiguration({loader: 'jspm',preprocessor: 'stylus',framework: 'bootstrap'}, needsJspm));

    describe('running app with jspm, foundation and without preprocessor ', testConfiguration({loader: 'jspm'}, needsJspm));
    describe('running app with jspm, less and foundation ', testConfiguration({loader: 'jspm',preprocessor: 'less',framework: 'foundation'}, needsJspm));
    describe('running app with jspm, sass (ruby) and foundation ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: false,framework: 'foundation'}, needsJspm, ['grunt-sass']));
    describe('running app with jspm, sass (node) and foundation ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: true,framework: 'foundation'}, needsJspm, ['grunt-contrib-sass']));
    describe('running app with jspm, stylus and foundation ', testConfiguration({loader: 'jspm',preprocessor: 'stylus',framework: 'foundation'}, needsJspm));

    describe('running app with jspm, pure and without preprocessor ', testConfiguration({loader: 'jspm'}, needsJspm));
    describe('running app with jspm, less and pure ', testConfiguration({loader: 'jspm',preprocessor: 'less',framework: 'pure'}, needsJspm));
    describe('running app with jspm, sass (ruby) and pure ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: false,framework: 'pure'}, needsJspm, ['grunt-sass']));
    describe('running app with jspm, sass (node) and pure ', testConfiguration({loader: 'jspm',preprocessor: 'sass',libsass: true,framework: 'pure'}, needsJspm, ['grunt-contrib-sass']));
    describe('running app with jspm, stylus and pure ', testConfiguration({loader: 'jspm',preprocessor: 'stylus',framework: 'pure'}, needsJspm));

    describe('running app with requirejs and without preprocessor,framework ', testConfiguration());
    describe('running app with requirejs, less and without framework ', testConfiguration({preprocessor: 'less'}));
    describe('running app with requirejs, sass (ruby) and without framework ', testConfiguration({preprocessor: 'sass',libsass: false}, ['grunt-sass']));
    describe('running app with requirejs, sass (node) and without framework ', testConfiguration({preprocessor: 'sass',libsass: true}, ['grunt-contrib-sass']));
    describe('running app with requirejs, stylus and without framework ', testConfiguration({preprocessor: 'stylus'}));

    describe('running app with requirejs, uikit and without preprocessor ', testConfiguration());
    describe('running app with requirejs, less and uikit ', testConfiguration({preprocessor: 'less',framework: 'uikit'}));
    describe('running app with requirejs, sass (ruby) and uikit ', testConfiguration({preprocessor: 'sass',libsass: false,framework: 'uikit'}, ['grunt-sass']));
    describe('running app with requirejs, sass (node) and uikit ', testConfiguration({preprocessor: 'sass',libsass: true,framework: 'uikit'}, ['grunt-contrib-sass']));
    describe('running app with requirejs, stylus and uikit ', testConfiguration({preprocessor: 'stylus',framework: 'uikit'}));

    describe('running app with requirejs, bootstrap and without preprocessor ', testConfiguration());
    describe('running app with requirejs, less and bootstrap ', testConfiguration({preprocessor: 'less',framework: 'bootstrap'}));
    describe('running app with requirejs, sass (ruby) and bootstrap ', testConfiguration({preprocessor: 'sass',libsass: false,framework: 'bootstrap'}, ['grunt-sass']));
    describe('running app with requirejs, sass (node) and bootstrap ', testConfiguration({preprocessor: 'sass',libsass: true,framework: 'bootstrap'}, ['grunt-contrib-sass']));
    describe('running app with requirejs, stylus and bootstrap ', testConfiguration({preprocessor: 'stylus',framework: 'bootstrap'}));

    describe('running app with requirejs, foundation and without preprocessor ', testConfiguration());
    describe('running app with requirejs, less and foundation ', testConfiguration({preprocessor: 'less',framework: 'foundation'}));
    describe('running app with requirejs, sass (ruby) and foundation ', testConfiguration({preprocessor: 'sass',libsass: false,framework: 'foundation'}, ['grunt-sass']));
    describe('running app with requirejs, sass (node) and foundation ', testConfiguration({preprocessor: 'sass',libsass: true,framework: 'foundation'}, ['grunt-contrib-sass']));
    describe('running app with requirejs, stylus and foundation ', testConfiguration({preprocessor: 'stylus',framework: 'foundation'}));

    describe('running app with requirejs, pure and without preprocessor ', testConfiguration());
    describe('running app with requirejs, less and pure ', testConfiguration({preprocessor: 'less',framework: 'pure'}));
    describe('running app with requirejs, sass (ruby) and pure ', testConfiguration({preprocessor: 'sass',libsass: false,framework: 'pure'}, ['grunt-sass']));
    describe('running app with requirejs, sass (node) and pure ', testConfiguration({preprocessor: 'sass',libsass: true,framework: 'pure'}, ['grunt-contrib-sass']));
    describe('running app with requirejs, stylus and pure ', testConfiguration({preprocessor: 'stylus',framework: 'pure'}));

});
