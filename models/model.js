// constructor
function Model(dbAccess) {
	this.dbAccess = dbAccess;
	this.updateIntervalMinutes = 360;
}

Model.prototype = {
	lastUpdate: function(callback) {
		var time = null;
		this.dbAccess.getDb().collection('appData', function(err, collection) {
	        collection.findOne({name: 'lastUpdate'}, function(err, item) {
	        	if (item != null) {
	        		time = item.value;
	        	}
	        	callback(time);
	        });
	    });
	},

	updateInterval: function() {
		return this.updateIntervalMinutes; /* 1 day = 1440 minutes */
	},

	updateIntervalMs: function() {
		return this.updateIntervalMinutes * 60 * 1000;
	},

	maxMeetingsInSnapshot: function() {
		return 5;
	},

	snapshots: function(callback) {
		var snapshots = [];
		this.dbAccess.getDb().collection('snapshots', function(err, collection) {
			collection.find().toArray(function(err, items) {
	        	if (items != null) {
	        		for (var i in items) {
	        			snapshots.push({created: new Date(items[i].created), node: items[i].node, edge: items[i].edge});
	        		}
	        	}
    			callback(snapshots);
	        });
	    });
	}
};

module.exports = Model;