
var diff = 24*60*60*1000,
	num = 50,
	t = (new Date).getTime() - 50*diff;
	updateIntervalMinutes = 1,
	dbAccess = null;

// constructor
function Model(iDbAccess) {
	dbAccess = iDbAccess;
}

Model.prototype = {
	lastUpdate: function(callback) {
		var time = null;
		dbAccess.getDb().collection('appData', function(err, collection) {
	        collection.findOne({name:'lastUpdate'}, function(err, item) {
	        	if (item != null) {
	        		time = item.value;
	        	}
	        	callback(time);
	        });
	    });
	},
	updateInterval: function() { return updateIntervalMinutes; /* 1 day = 1440 minutes */ },
	updateIntervalMs: function() { return updateIntervalMinutes * 60 * 1000;},
	snapshots: function(callback) {
		var snapshots = [];
		dbAccess.getDb().collection('snapshots', function(err, collection) {
			collection.find().toArray(function(err, items) {
	        	if (items != null) {
	        		for(var i in items) {
	        			snapshots.push({created: new Date(items[i].created), node: items[i].node, edge: items[i].edge});
	        		}
	        	}
    			callback(snapshots);
	        });
	    });
	}
};

module.exports = Model;