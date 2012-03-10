module.exports = (function() {
	var diff = 24*60*60*1000,
		num = 50,
		t = (new Date).getTime() - 50*diff;
		snapshots = [];

		for (var i = 0; i < num; i+=1, t+=diff) {
			snapshots.push({created: new Date(t), node: Math.floor(Math.random()*300), edge: Math.floor(Math.random()*600)});
		}

	return {
		lastUpdate: function() { return new Date(t); },
		updateInterval: function() { return 1440; /* 1 day = 1440 minutes */ },
		snapshots: function() {
			return snapshots;
		}
	};
})();
