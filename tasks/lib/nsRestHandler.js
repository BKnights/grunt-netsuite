const needle = require('needle');
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const Agent = require('https').Agent;
const debug = require('debug')('kotn-nso');


function promiseTry(pSrc, maxTries, minDelay, maxDelay, canRetry){ //NS prone to spurious failures due to overloading
	return new Promise((resolve, reject)=>{

		minDelay = minDelay || 0;
		const delaySize = maxDelay - minDelay;
		const t = function(){ return Math.floor(Math.random()* delaySize)+ minDelay;};
		let firstReason = null;

		function doRetry(triesLeft){

			pSrc().then((data)=>{
				resolve(data);
			}).catch((reason)=>{
				if(!firstReason) firstReason = reason;
				console.error('in retry error with '+ triesLeft +' for '+reason.toString());
				if(triesLeft  && canRetry(reason)){
					setTimeout(()=>{ doRetry(triesLeft-1);}, t());
				} 
				else reject(firstReason);
			});
		}
		doRetry(maxTries -1);
	});
}

function hasReason(msg, reasons){
	for(var i = 0; i< reasons.length;i++){
		if(msg.indexOf(reasons[i]) != -1) return true;
	}
	return false;
}

var agentPool = {};
function getAgent(accountId){
	var agentKey = accountId+'::'; // + tokenId;
	var agent = agentPool[agentKey];
	if(!agent){
		console.log('new agent for '+agentKey);
		agent = new Agent({
			keepAlive:false,
			maxSockets:2 // one in reserve for slow closers
		});
		agentPool[agentKey] = agent;
	}
	return agent;
}


/**
 * [RESTHandler description]
 * @param {options} options {accountId, consumerKey,consumerSecret,tokenId,tokenSecret}
 */
function RESTHandler(options) {


	const config = Object.assign({
		maxTries:3,
		minRetryDelay: 800,
		maxRetryDelay:30000,
		canRetry: function(reason){
			var reasonText =  reason.message || JSON.stringify(reason);
			if(hasReason(reasonText, ['ECONNRESET', 'ESOCKETTIMEDOUT','ETIMEDOUT', 'SSS_REQUEST_LIMIT_EXCEEDED'])) {
				console.error('retrying because: '+reasonText);
				return true;
			}
			console.error('no retry with: '+reasonText);
			return false;
		}
	}, options);

	const oauth = OAuth({
		consumer: {
			key: config.consumerKey,
			secret: config.consumerSecret
		},
		signature_method: 'HMAC-SHA1',
		parameter_seperator: ',',
		hash_function: function(base_string, key) {
			return crypto.createHmac('sha1', key).update(base_string).digest('base64');
		}
	});
	const token = {
		key: config.tokenId,
		secret: config.tokenSecret
	};

	function makeRequest(url, method, payload) {
		debug(method +' '+ JSON.stringify(url));
		var requestData = {
			url: url,
			method: method
		};
		if(payload){
			requestData.body = payload;
		}
		
		var headers = oauth.toHeader(oauth.authorize(requestData, token));
		headers.Authorization += ',realm="' + config.accountId + '"';
		headers.authorization = headers.Authorization;
		delete headers.Authorization;
		headers['content-type'] = 'application/json';
		headers['accept'] = 'application/json';

		//console.log(JSON.stringify(headers, null, '  '));
		const options = {
			headers:headers,
			agent:getAgent(config.accountId, config.tokenId),
			timeout : 30000,
			strictSSL : true,
			time:false
		};
	
		var processRequest = function(){
			var headers = null;
			return needle(method.toLowerCase(), url, payload, options).then(resp=>{
				debug(resp.statusCode +' ' + JSON.stringify(resp.headers, null, ' '));
				headers = resp.headers;

				if(resp.statusCode != 200 && resp.statusCode != 201){
					throw new Error(resp.statusCode +': '+ (resp.body || 'unexpected error'));
				}
				if(!resp.body) throw new Error('Unexpected Response');
				return resp.body;
			}).catch(error=>{
				if(headers){
					console.error('Error returned with ' + headers);
				}
				throw (error instanceof Error) ? error : new Error(JSON.stringify(error));
			});
		};
		return promiseTry(processRequest, config.maxTries, config.maxRetryDelay, config.minRetryDelay, config.canRetry);
	}

	return{
		get: function(url){
			return makeRequest(url, 'GET');
		},
		put: function(url, data){
			return makeRequest(url, 'PUT', data);
		},
		post: function(url, data){
			return makeRequest(url, 'POST', data);
		},
		destroy : function(){
			//nsAgent.destroy();
		}
	};
}
module.exports = RESTHandler;