/*
 * grunt-netsuite
 * https://github.com/bknights/grunt-netsuite
 *
 * Copyright (c) 2020 Brett Knights
 * Licensed under the MIT license.
 */

'use strict';
var ns_config = require('./ns_config.json');

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp']
    },

    // Configuration to be run (and then tested).
    netsuite: {
      options:Object.assign({
        rate_limit_delay:300,
      }, ns_config),
      web: {
        options: {
          overwriteFiles:true,
        },
        files: [
          {cwd:'test/fixtures/site/', src:['**/*'], filter:'isFile', dest:'4085'}
         ]
      },
      ssp: {
        options: {
          basePath:"test/fixtures/SSP",
          overwriteFiles:true        
        },
        files: [
          {cwd: 'test/fixtures/SSP/', src:['**/*'], filter:'isFile', dest:'Web Site Hosting Files/Live Hosting Files/SSP Applications/KOTN/Simple'}
        ]
      }
    },

    watch:{
      options:{
        spawn:false
      },
      web:{
        files:  ['test/fixtures/site/**/*'],
        tasks:['netsuite:web']
      },
      ssp:{
        files:  ['test/fixtures/SSP/**/*'],
        tasks:['netsuite:ssp']
      }

    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js']
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'netsuite', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
