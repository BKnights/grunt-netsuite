# grunt-netsuite

> Upload project files to Netsuite File Cabinet

## Getting Started
This plugin requires Grunt `~1.0.4`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-netsuite --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-netsuite');

```

The netsuite task requires options. The samples below have the secure options in a file ns_config.json. This file should not be committed to version control or be allowed to escape to the public.

```json
{

	"NS_CONSUMER_KEY" :    "from your integrations setup",
	"NS_CONSUMER_SECRET" : "from your integrations setup",
	"NS_TOKEN_ID" :        "from your token setup",
	"NS_TOKEN_SECRET" :    "from your token setup",
	"NS_ACCOUNT_ID" :"YOUR ACCOUNT ID. IN UPPERCASE IF IT HAS LETTERS",
	"NS_UPLOAD_PATH" : "https://account_id.restlets.api.netsuite.com... from the setup of the companion restlet"
}
```

## Companion Bundle
This package works with a RESTlet that handles navigating the Netsuite file cabinet. Bundle 322271 is a public bundle that has the RESTLet and a role with just enough permissions for the uploads. The bundle's code is available at https://github.com/BKnights/grunt-netsuite-restlet

## Access
In order to use the RESTlet you'll need to create access. See the Netsuite help for creating an integration and token based access.

When the integration is created Netsuite will present integration id and secret tokens. These should be copied and pasted to the ns_config.json file.

When the access tokens are created they too should be copied and pasted to the ns_config.json file.

When you have deployed the RESTlet (either via the bundle installation or by downloading and installing this code) copy its external URL to ns_config.json as well.

## The "netsuite" task

### Overview
In your project's Gruntfile, add a section named `netsuite` to the data object passed into `grunt.initConfig()`. Note the two ways to specify the root of the Netsuite destination. The 4085 is the internal id of a folder under  Live Hosting Files.

```js
var ns_config = require('./ns_config.json');

grunt.initConfig({
  netsuite: {
    options:Object.assign({
        rate_limit_delay:300,
        overwriteFiles:true,
        isPublic:true
      }, ns_config),
    web: {
      // Target-specific file lists and/or options go here.
      files: [
          {cwd:'path to file/not part of Netsuite path/', src:['**/*', '!*.bak'], filter:'isFile', dest:4085}
         ]
    },
    ssp: {
      files: [
        {cwd: 'project/path to/SSP/', src:['**/*', '!**/*.bak'], filter:'isFile', dest:'Web Site Hosting Files/Live Hosting Files/SSP Applications/KOTN/Simple'}
      ]
    }
  },
});
```

### Watching files
If you want to watch files and upload them automatically then:
```shell
npm install grunt-contrib-watch --save-dev
```

Enable it inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-contrib-watch');

```

```js
var ns_config = require('./ns_config.json');

grunt.initConfig({
  netsuite: {
    ...
  },

  watch:{
    options:{
      spawn:false
    },
    web:{
      files:  ['path to file/not part of Netsuite path/**/*'],
      tasks:['netsuite:web']
    },
    ssp:{
      files:  ['project/path to/SSP/**/*'],
      tasks:['netsuite:ssp']
    }

  }
}
```
