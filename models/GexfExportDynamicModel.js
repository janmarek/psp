var _ = require('underscore')._;

var colorTable = {
	"ČSSD":"E87116",
	"KSČM":"D8221C",
	"ODS":"1C51FF",
	"TOP09-S":"8532C1",
	"VV":"F0D821",
	"_":"888888"
};


function GexfExportModel(mongo, model) {
	this.mongo = mongo;
	this.model = model;
}

GexfExportModel.prototype = {
	getNodes: function (callback) {
		this.model.poslanecMap(function (poslanci) {
			var nodes = [];

			poslanci.forEach(function (poslanec) {
				var color = colorTable[poslanec.strana];
				color = (color !== undefined) ? color : colorTable._;

				nodes.push({
					name: 'node',
					attrs: {
						id: poslanec.id,
						label: poslanec.jmeno + ' (' + poslanec.strana + ')'
					},
					children: [
						{
							name: 'viz:color',
							attrs: {
								r: parseInt(color.substr(0, 2), 16),
								g: parseInt(color.substr(2, 2), 16),
								b: parseInt(color.substr(4, 2), 16)
							}
						}
					]
				})
			});

			callback(nodes);
		});
	},

	getEdges: function (callback) {
		var self = this;

		var edges = {};

		var index = 1;

		var start = 0, end;

		this.model.allMeetings(function (meetings) {

			meetings.forEach(function (meeting, iMeeting) {
				end = parseInt(meeting.id, 10);

				meeting.hlasovani.forEach(function (hlasovani) {
					console.log('hlasovani ' + (index++))
					var votes = [];

					hlasovani.hlasy.forEach(function (vote) {
						votes.push(vote);
					});

					for (var i = 0; i < votes.length; i++) {
						for (var j = 0; j < votes.length; j++) {
							//console.log('i:' + i + ', j:' + j)

							if (i === j) {
								continue;
							}

							var key = self._getEdgeKey(votes[i], votes[j]);

							if (!edges[key]) {
								edges[key] = {
									from: votes[i].poslanecId,
									to: votes[j].poslanecId,
									points: 0,
									snapshots: [],
                                    spells: []
								}
							}

							if ((votes[i].akce === 'A' || votes[i].akce === 'N' || votes[i].akce === 'Z')
								&& (votes[j].akce === 'A' || votes[j].akce === 'N' || votes[j].akce === 'Z')) {
								if (votes[i].akce === votes[j].akce) {
									edges[key].points++;
								} else {
									edges[key].points--;
								}
							}
						}
					}

				});

				if (end % 5 === 0 && start < end) {
				console.log('snapshot', start, end);

//                 var sum = 0, avg = 0;
//
//                 _(edges).forEach(function (edge, key) {
//                     sum += edge.points;
//                     avg++;
//                 });
//                 avg = sum/avg*2;
//
                var keys = _(edges).keys().sort(function(a, b) {
                    return edges[b].points - edges[a].points;
                });

				//_(edges).forEach(function (edge, key) {
                keys.forEach(function(key, i) {
                    var edge = edges[key];
					//if (edge.points > avg) {
                    if (i < keys.length/10) {
						edge.snapshots.push({
							name: 'attvalue',
							attrs: {
								for: '0',
								value: 1 + edge.points,
								start: start,
								end: end
							}
						});
                        edge.spells.push({
                            name: 'spell',
                            attrs: {
                                start: start,
                                end: end
                            }
                        });
                    }
					edge.points = 0;
				});

				start = end;

				}

			});

			callback(self._convertEdgesToXml(edges));
		});

	},

	_getEdgeKey: function (vote1, vote2) {
		return parseInt(vote1.poslanecId) > parseInt(vote2.poslanecId) ? (vote1.poslanecId + '-' + vote2.poslanecId) : (vote2.poslanecId + '-' + vote1.poslanecId);
	},

	_convertEdgesToXml: function (edges) {
		console.log('konvertuju');

		var xml = [];
		_(edges).forEach(function (edge, key) {
            if (edge.snapshots.length === 0) {
                return;
            }
			xml.push({
				name: 'edge',
				attrs: {
					id: key,
					source: edge.from,
					target: edge.to,

				},
				children: [
					{name: 'attvalues',
					 children: edge.snapshots},
                    {name: 'spells',
                     children: edge.spells}
				]
			});
		});

		console.log('hran: ' + xml.length);

		return xml;
	}

};

module.exports = GexfExportModel;