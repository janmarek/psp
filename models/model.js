
var diff = 24*60*60*1000,
	num = 50,
	t = (new Date).getTime() - 50*diff;
	snapshots = [],
	updateIntervalMinutes = 1,
	dbAccess = null;

// constructor
function Model(iDbAccess) {
	dbAccess = iDbAccess;
	for (var i = 0; i < num; i+=1, t+=diff) {
		snapshots.push({created: new Date(t), node: Math.floor(Math.random()*300), edge: Math.floor(Math.random()*600)});
	}
}

Model.prototype = {
	lastUpdate: function() {
		var time = new Date(t);
		dbAccess.getDb().collection('appData', function(err, collection) {
	        collection.findOne({name:'lastUpdate'}, function(err, item) {
	        	if (item != null) {
	        		time = item.value;
	        	}
	        });
	    });
		return new Date(time);
	},
	updateInterval: function() { return updateIntervalMinutes; /* 1 day = 1440 minutes */ },
	updateIntervalMs: function() { return updateIntervalMinutes * 60 * 1000;},
	snapshots: function() {
		return snapshots;
	}
};

module.exports = Model;