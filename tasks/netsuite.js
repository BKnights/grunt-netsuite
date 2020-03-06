/*
 * grunt-netsuite
 * https://github.com/bknights/grunt-netsuite
 *
 * Copyright (c) 2020 Brett Knights
 * Licensed under the MIT license.
 */

'use strict';



module.exports = function(grunt) {

  var netsuite = require('./lib/netsuite')(grunt);

  // Please see the Grunt documentation for more information regarding task
  // creation: http://gruntjs.com/creating-tasks

  grunt.registerMultiTask('netsuite', 'Upload project files to Netsuite File Cabinet', function(p) {
    // Merge task-specific and/or target-specific options with these defaults.
    var options = this.options(netsuite.defaultOpts);

    const done = this.async();

    if(p){
      console.log('should run upload '+ p +' for '+ this.target);
      netsuite.upload(p, done, this.target, options);
    }else{
      console.log('should run deploy for '+ this.target);
      netsuite.deploy(done, this.target, options);
    }
  });

  grunt.event.on('watch', netsuite.watchHandler);

};
