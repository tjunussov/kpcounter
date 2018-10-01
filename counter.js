var dgram = require("dgram");
var server = dgram.createSocket("udp4");
var winston = require('winston');
var http = require('http');
var fs = require('fs');

var logger = new (winston.Logger)({
    transports: [
    	  new (winston.transports.Console)()/*,
	      new (winston.transports.File)({
	      	name: 'info-main_api',
			level:'info',
			json:false,
			timestamp:false,
			showLevel:false,
			filename: '/var/log/nginx/track/winston/main_api.access.log',
			maxFiles:10,
			maxsize:10000000
		}),
		 new (winston.transports.File)({
		 	name: 'info-api',
			level:'debug',
			json:false,
			timestamp:false,
			showLevel:false,
			filename: '/var/log/nginx/track/winston/api.access.log',
			maxFiles:10,
			maxsize:10000000
		})*/
    ]
  });

var main_api_hits = 0;
var api_hits = 0;
var main_api_hits_max_request_time = 0;
var api_hits_max_request_time = 0;


//create an event listener for when a syslog message is recieved
server.on("message", function (msg, rinfo) {
	
try { 
    //sanitise the data by replacing single quotes with two single-quotes
    var message = msg.toString().replace(/'/g, "''");
    var message_log = message.substring(62);
    var message_array = message_log.split(',');
    
    
    
    //main_index_api_errors
    if(message.indexOf('main_index_api') > 0){

    	hitPerSecond();
    	
	    if(message.indexOf('details') > 0){
	    	main_api_hits++;
	    	obj.main_api_hits.now = main_api_hits;
	    	
	    	console.log("main_api:details="+main_api_hits);
	    	obj.main_api_hits.last_10_logs.unshift(message_array);
	    	obj.main_api_hits.last_10_logs.pop();
	    	
	    	if(message_array[2]=="404"){
	    		obj.main_api_hits.not_found++;
	    	} else if(message_array[2]=="429"){
	    		obj.main_api_hits.quota_exceed++;
	    	} else if(message_array[2]=="406"){
	    		obj.main_api_hits.wrong_format++;
	    	} else if(message_array[2]=="403"){
	    		obj.main_api_hits.forbidden++;
	    	} else if(message_array[2]=="200"){
				// ok
	    	} else {
	    		obj.main_api_hits.error_others++;
	    	}
	    	
	    	if(message_array[5]=="HIT"){
	    		obj.main_api_hits.from_cache++;
	    	}
	    	
	    	main_api_hits_max_request_time = Number(message_array[4]);
	    		
	    	if(main_api_hits_max_request_time > obj.main_api_hits.max_request_time )
	    		obj.main_api_hits.max_request_time = main_api_hits_max_request_time;
	    	
		} else if(message.indexOf('events') > 0){
			console.log("main_api:events");
			obj.main_api_hits.events++;
		} else {
			console.log("main_api:other");
			obj.main_api_hits.index++;
		}
		
		logger.info(message_log);
		
	} else if(message.indexOf('main_api') > 0){
		
		hitPerSecond();
		
		if(message.indexOf('events') > 0){
			console.log("api:events");
			obj.api_hits.events++;
		} else {
			api_hits++;
			obj.api_hits.now = api_hits;
			
	    	console.log("api:details="+api_hits);
	    	obj.api_hits.last_10_logs.unshift(message_array);
	    	obj.api_hits.last_10_logs.pop();
	    	
	    	if(message_array[2]=="404"){
	    		obj.api_hits.not_found++;
	    	} else if(message_array[2]=="429"){
	    		obj.api_hits.quota_exceed++;
	    	} else if(message_array[2]=="406"){
	    		obj.api_hits.wrong_format++;
	    	} else if(message_array[2]=="403"){
	    		obj.api_hits.forbidden++;
	    	} else if(message_array[2]=="200"){
				// ok
				
	    	} else {
	    		
	    		console.log("status " + message_array[2]);  
	    		obj.api_hits.error_others++;
	    	}
	    	
	    	if(message_array[5]=="HIT"){
	    		obj.api_hits.from_cache++;
	    	}
	    	
	    	var api_hits_max_request_time = Number(message_array[4]);
	    		
	    	if(api_hits_max_request_time > obj.api_hits.max_request_time )
	    		obj.api_hits.max_request_time = api_hits_max_request_time;
		}

		logger.debug(message_log);
	} else {
		console.log("other syslog recieved " + message_log);  
	}
} catch(e){
	console.error(e);
}

});

//create an event listener to tell us that the has successfully opened the syslog port and is listening for messages
server.on("listening", function () {
   var address = server.address();
   console.log("syslog server listening " + address.address + ":" + address.port);  
});


var obj = {
	date:new Date().toString(),
	curr_hour:'',
	main_api_hits: { 
		now:0,
		max:0,
		avg:0,
		not_found:0,
		wrong_format:0,
		quota_exceed:0,
		forbidden:0,
		error_others:0,
		from_cache:0,
		max_request_time:0,
		avg_request_time:0,
		events:0,
		index:0,
		last_10_logs:['','','','','','','','','',''],
		total:{}
	},
	api_hits: { 
		now:0,
		max:0,
		avg:0,
		not_found:0,
		wrong_format:0,
		quota_exceed:0,
		forbidden:0,
		error_others:0,
		from_cache:0,
		max_request_time:0,
		avg_request_time:0,
		events:0,
		last_10_logs:['','','','','','','','','',''],
		total:{}
	}
};

// Persister
var DBFILENAME = 'counter.json';
try { 
	var obj_json = JSON.parse(fs.readFileSync(DBFILENAME));
		obj = merge(obj,obj_json);
		console.error("Persistance read from file success",obj);
} catch(e) { 
	console.error("Persistance new file created",e);
} // read DB from disk

function merge(source,destination) {
    var prop;
    for ( prop in source ) {
        if ( prop in destination && Array.isArray( destination[ prop ] ) ) {
            // Concat Arrays
            destination[ prop ] = destination[ prop ] = source[ prop ];
        } else if ( prop in destination && typeof destination[ prop ] === "object" ) {
            // Merge Objects
            destination[ prop ] = merge( destination[ prop ], source[ prop ] );
        } else {
            // Set new values
            if(source[ prop ]!=null) destination[ prop ] = source[ prop ];
        }
    }
    return destination;
};

var not_terminated = true;
function serializeSync() {
	if(not_terminated){
		fs.writeFileSync(DBFILENAME + '.temp',JSON.stringify(obj));
		fs.rename(DBFILENAME + '.temp', DBFILENAME);
		console.log("Persistance write to file success",obj);
		not_terminated = false;
		process.exit(0);
	} else {
		process.exit(0);
	}
}
//setInterval(function () { fs.writeFile(DBFILENAME + '.temp', JSON.stringify(obj), function(err) { if (!err) { fs.rename(DBFILENAME + '.temp', DBFILENAME); } } ); }, 60 * 1000); // serialize to disk every minute
process.on('exit', serializeSync); 
process.on('SIGINT', serializeSync); 
process.on('SIGTERM', serializeSync); // serialize to disk when process terminates

var main_api_hits_calcs = 0;
var api_hits_calcs = 0;

function calculate(){
	if(main_api_hits > 0){
		main_api_hits_calcs++;
		//if(obj.main_api_hits.total[curr_hour]) obj.main_api_hits.total[curr_hour] = 0;
		obj.main_api_hits.total[curr_hour] += main_api_hits; // увеличиваем общее колво ежесекундно
		//obj.main_api_hits.avg = Math.round(obj.main_api_hits.total[curr_hour]/main_api_hits_calcs);
		if(obj.main_api_hits.max < main_api_hits) // увеличиваем макс кол-во запросов в секунду, если оно превысило предыдущее
			obj.main_api_hits.max = main_api_hits;
		main_api_hits = 0;
		obj.main_api_hits.now = main_api_hits;
	}
	
	if(api_hits > 0){
		api_hits_calcs++;
		//if(!obj.api_hits.total[curr_hour]) obj.api_hits.total[curr_hour] = 0;
		obj.api_hits.total[curr_hour] += api_hits; // увеличиваем общее колво ежесекундно
		obj.api_hits.now = api_hits;
		//obj.api_hits.avg = Math.round(obj.api_hits.total[curr_hour]/api_hits_calcs);
		if(obj.api_hits.max < api_hits) // увеличиваем макс кол-во запросов в секунду, если оно превысило предыдущее
			obj.api_hits.max = api_hits;
		api_hits = 0;
		obj.api_hits.now = api_hits;
	}
}
// Hit per seconds meausre
var timeout = null;
var curr_hour = old_hour = 'hh_'+new Date().getHours();
	obj.curr_hour = curr_hour;

function hitPerSecond(){
	if(!timeout){
		timeout = setTimeout(function(){
			timeout = null;
			calculate();
			
			// Ещечасный ресет
			curr_hour = 'hh_'+new Date().getHours();
			if(curr_hour != old_hour){
				obj.main_api_hits.total[curr_hour] = 0;
				obj.api_hits.total[curr_hour] = 0;
				
				obj.api_hits.not_found = 0;
				obj.api_hits.wrong_format = 0;
				obj.api_hits.quota_exceed = 0;
				obj.api_hits.forbidden = 0;
				obj.api_hits.error_others = 0;
				obj.api_hits.from_cache = 0;
				
				obj.main_api_hits.not_found = 0;
				obj.main_api_hits.wrong_format = 0;
				obj.main_api_hits.quota_exceed = 0;
				obj.main_api_hits.forbidden = 0;
				obj.main_api_hits.error_others = 0;
				obj.main_api_hits.from_cache = 0;
				
				old_hour = curr_hour;
				obj.curr_hour = curr_hour;
				console.log("reseting hour",curr_hour);
			}
			
			console.log("startMeasure expired");
		},1000);
	}
}

//bind the server to port 514 (syslog)
server.bind(1860);

http.createServer(function (request, response) {
	//console.log('New request');
    response.writeHead(200, {'Content-Type': 'application/json'});
    obj.date = new Date().toString();
    response.write(JSON.stringify(obj));
    response.end();
}).listen(1861);

console.log("http server listening 1861");