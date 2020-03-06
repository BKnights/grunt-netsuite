'use strict';


const path = require('path');
const debug = require('debug')('kotn-nso');

const NSHandler = require('./nsRestHandler');

const isBinaryFileSync = require('isbinaryfile').isBinaryFileSync;
const mime = require('mime-types');

function getNSHandler(options){
	return NSHandler({
		accountId : options.NS_ACCOUNT_ID , 
		consumerKey : options.NS_CONSUMER_KEY,
		consumerSecret : options.NS_CONSUMER_SECRET,
		tokenId : options.NS_TOKEN_ID,
		tokenSecret : options.NS_TOKEN_SECRET
	});
}

function isNumeric(n){return !isNaN(parseFloat(n)) && isFinite(n);}

function prepFile(grunt, fileSpec){
	var rootIsFolderId = isNumeric(fileSpec.dest);

	var filePath = path.join(fileSpec.cwd, fileSpec.src);

	var isBinary = isBinaryFileSync(filePath);

	var contents = grunt.file.read(filePath, {encoding:isBinary ? null : 'utf8'});

	return {
		rootId: rootIsFolderId ? fileSpec.dest : null,
		folderPath : ((rootIsFolderId ? '' : fileSpec.dest) + '/'+path.dirname(fileSpec.src)).replace(/\/{2}/g, '/'),
		fileName : path.basename(fileSpec.src),
		content : isBinary ? contents.toString('base64') : contents.toString(),
		encoding: isBinary ? null : 'utf8',
		mimeType : mime.lookup(fileSpec.src)
	};

}

function rateLimit(prev, delay){
	return new Promise(resolve=>{
		setTimeout(()=>{
			resolve(prev);
		}, delay);
	});
}

module.exports = function(grunt){
	var netsuite = {};

	netsuite.defaultOptions = {
		overwriteFiles:false
	};

	netsuite.upload = function(filepath, cb, target, options){

		var spec = netsuite._findFileSpec(filepath, target);

		if(!spec){
			cb();
			return;
		}

		debug('upload spec: '+ JSON.stringify(spec));
		var nsHandler = getNSHandler(options);
		return nsHandler.post(options.NS_UPLOAD_PATH, JSON.stringify(prepFile(grunt, spec))).then((data)=>{
			debug(JSON.stringify(data));
			return data;
		}).then(()=>{
			cb();
			return null;
		}).catch(error=>{
			cb(error);
			return null;
		});
	};

	netsuite.deploy = function(done, target, options){
		console.log('deploy: '+ target);

		var watched = grunt.config('netsuite.'+target +'.watched');

		var flat = (watched && watched.length) ? 
			watched.map((w)=>(netsuite._findFileSpec(w, target))).filter((f)=>f) :
			netsuite._listFiles(target);

		grunt.config('netsuite.'+target +'.watched', null);
		console.log('have '+ flat.length +' in ' + target);
		if(flat.length){
			var nsHandler = getNSHandler(options);
			var fileCount = flat.length;
			var uploaded = 0;
			console.log('about to do it');
			const doIt = ()=>{
				if(!flat.length) return null;
				var nextFile = flat.shift();

				return nsHandler.post(options.NS_UPLOAD_PATH, JSON.stringify(prepFile(grunt, nextFile))).then((data)=>{
					debug(JSON.stringify(data));
					uploaded++;
					return rateLimit(data, options.rate_limit_delay).then(doIt);
				});
			};

			doIt().then(()=>{
				console.log('uploaded '+ uploaded +' of ' + fileCount);
				done();
			}).catch(err=>{
				done(err);
			});
		}else{
			done();
		}
	};

	/*
	 * Helper for reporting messages to the user.
	 *
	 * @param {string} msg
	 */
	netsuite.notify = function(msg, err) {
		var config = grunt.config('netsuite');

		msg = decodeURI(msg);
		err = err || false;

		if (!config.options.disable_grunt_log) {
			if (err) {
				grunt.log.error('[grunt-netsuite] - ' + msg);
			} else {
				grunt.log.ok('[grunt-netsuite] - ' + msg);
			}
		}
	};

	netsuite._listFiles = function(target){
		if (!netsuite[target] || !netsuite[target]._filesList) {
			netsuite[target] = netsuite[target] || {};
			netsuite[target]._filesList = grunt.task.current.files.reduce((a, spec)=>{
				var paths = spec.src.map(s=>({
					cwd:spec.cwd,
					src:s, 
					dest:spec.dest
				}));
				return a.concat(paths);
			}, []);
		}

		return netsuite[target]._filesList;
	};

	netsuite._findFileSpec =  function(filePath, target){
		var flat = netsuite._listFiles(target);
		return flat.find(f=>(f.src == filePath || (f.cwd+f.src) == filePath));
	};


	function normalize(fp){
		return path.normalize(fp).split(path.sep).join('/');
	}

	
	function debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this,
				args = arguments;
			var later = function() {
				timeout = null;
				if ( !immediate ) {
					func.apply(context, args);
				}
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait || 200);
			if ( callNow ) { 
				func.apply(context, args);
			}
		};
	}

	var changedFiles = Object.create(null);
	var onChange = debounce(function(target){
		grunt.config('netsuite.'+target +'.watched', Object.keys(changedFiles[target]));
		changedFiles = Object.create(null);
	}, 200);

	netsuite.watchHandler = function(action, filepath, target){

		netsuite[target] = netsuite[target] || {};
		netsuite[target]._filesList = null;

		changedFiles[target] = changedFiles[target] || {};
		changedFiles[target][normalize(filepath)] = action;

		onChange(target);

	};

	return netsuite;
};

