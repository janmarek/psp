// imports
var Parsing = require('./parsing'),
	dbAccess = null, parsing = null, model = null;

// constructor
function DataHandler(iDbAccess, iModel) {
	dbAccess = iDbAccess;
	parsing = new Parsing();
	model = iModel;
}

DataHandler.prototype = {
	/**
	 * If there are some new data, creates new snapshot.
	 */
	createSnapshot: function() {
		parsing.getSeznamSchuzi(null, function(schuzeNew) {
		
			dbAccess.getDb().collection('snapshots', function(err, collection) {
				collection.find().toArray(function(err, items) {
					// get previously created data info
					var schuzeStored = [];
		        	if (items != null) {
		        		for(var i in items) {
		        			if (items[i].schuze != null) {
		        				for(var j in items[i].schuze) {
		        					schuzeStored.push({obdobi: new Date(items[i].schuze[j].obdobi), id: items[i].schuze[j].id});
		        				}        				
		        			}
		        		}
		        	}
		        	
		        	// fetch and store only new data
		        	for(var i in schuzeNew.schuze) {
		        		var newOne = schuzeNew.schuze[i];
		        		var found = false;
		        		for(var j in schuzeStored) {
		        			if (newOne.title == schuzeStored[j].id && schuzeNew.obdobi == schuzeStored[j].id) {
		        				found = true;
		        				break;
		        			}
		        		}
		        		if (!found) {
		        			parsing.getSeznamHlasovani(schuzeNew.obdobi, newOne.title, function(data) {
		                        console.log(data);
		                    });
		        		}
		        	}
		        	
		        	
		        	dbAccess.getDb().collection('appData', function(err, collection) {
		    	        collection.update({name:'lastUpdate'}, {$set:{value:(new Date()).getTime()}}, {safe:true}, function(err, result) {});
		    	    });
		        	
	    			
		        });
		    });
			
			
        });
		
		
	}
};

module.exports = DataHandler;