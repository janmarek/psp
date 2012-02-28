var escape = require('ejs/lib/utils').escape;
var _ = require('underscore')._;

module.exports = {
	session: function(req, res)
	{
		return req.session;
	},

	flash: function(req, res)
	{
		return req.flash();
	},

	// template helpers

	_: function ()
	{
		return _;
	},

	textarea: function (req, res)
	{
		return function(value, name, attrs) {
			attrs = attrs || {};
			attrs.rows = attrs.rows || 20;
			attrs.cols = attrs.cols || 50;
			attrs.name = name;
			attrs.id = name;
			return htmlTag({
				name: 'textarea',
				attrs: attrs,
				text: value,
				pair: true
			});
		}
	},

	input: function (req, res)
	{
		return function(value, name, attrs) {
			attrs = attrs || {};
			attrs.type = attrs.type || 'text';
			attrs.size = attrs.size || 30;
			attrs.name = name;
			attrs.value = value;
			attrs.id = name;

			return htmlTag({
				name: 'input',
				attrs: attrs
			});
		}
	},

	label: function (req, res)
	{
		return function(idName, name, attrs) {
			name = name || idName.charAt(0).toUpperCase() + idName.substr(1);
			attrs = attrs || {};
			attrs['for'] = idName;

			return htmlTag({
				name: 'label',
				attrs: attrs,
				text: name,
				pair: true
			});
		}
	},

	select: function (req, res)
	{
		return function(value, name, possibleValues, attrs) {
			attrs = attrs || {};
			attrs.name = name;
			attrs.id = name;

			var options = [];

			_.forEach(possibleValues, function (text, key) {
				options.push({
					name: 'option',
					text: text,
					attrs: {
						selected: key == value,
						value: key
					}
				});
			});

			return htmlTag({
				name: 'select',
				attrs: attrs,
				children: options,
				pair: true
			});
		}
	}
};

function htmlAttrs(attrs) {
	var txt = '';

	_(attrs).forEach(function (value, key) {
		if (value) {
			txt += ' ' + key;
			if (value !== true) {
				txt += '="' + escape(value) + '"';
			}
		}
	});

	return txt;
}

function htmlTag(options) {
	options.pair = options.pair || false;
	options.children = options.children || [];
	options.text = options.text || "";

	var txt = '';
	if (options.name) {
		txt += '<' + options.name + htmlAttrs(options.attrs) + '>';
	}
	if (options.text) {
		txt += options.text;
	}
	options.children.forEach(function (tag) {
		txt += htmlTag(tag);
	})
	if (options.name && options.pair) {
		txt += '</' + options.name + '>';
	}

	return txt;
}