var xmlbuilder = require('xmlbuilder');
var _ = require('underscore')._;

module.exports = {
	create: function (root, elements, rootAttrs) {
		var doc = xmlbuilder.create();

		var cur = doc.begin(root, {version: '1.0', encoding: 'UTF-8'});

		if (rootAttrs) {
			_(rootAttrs).forEach(function (val, key) {
				cur.att(key, val);
			});
		}

		function addChildren(cur, children) {
			children.forEach(function (child) {
				var childEl = cur.ele(child.name);

				if (child.attrs) {
					_(child.attrs).forEach(function (val, key) {
						childEl.att(key, val);
					});
				}

				if (child.text) {
					childEl.txt(child.text);
				}

				if (child.children) {
					addChildren(childEl, child.children);
				}
			});
		}

		addChildren(cur, elements);

		return doc;
	}
}