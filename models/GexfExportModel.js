var crypto = require('crypto');

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
	}
};

module.exports = GexfExportModel;