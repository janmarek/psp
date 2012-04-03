var crypto = require('crypto'),
	_ = require('underscore')._;

function GexfExportModel(mongo, model) {
	this.mongo = mongo;
	this.model = model;
}

GexfExportModel.prototype = {
	getNodes: function (callback) {
		this.model.poslanecMap(function (poslanci) {
			var nodes = [];

			poslanci.forEach(function (poslanec) {
				var color = crypto.createHash('sha1').update(poslanec.strana).digest('hex');

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

		this.model.allVotes(function (hlasovani) {
			hlasovani.forEach(function (votes) {
				console.log('hlasovani ' + (index++) + '/' + hlasovani.length)

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
								points: 0
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
			if (edge.points > 5) {
				xml.push({
					name: 'edge',
					attrs: {
						id: key,
						from: edge.from,
						to: edge.to,
						weight: 1 + edge.points / 10
					}
				});
			}
		});

		console.log('hran: ' + xml.length);

		return xml;
	}

};

module.exports = GexfExportModel;