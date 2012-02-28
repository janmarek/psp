module.exports = {
	// create action callback
	action: function (controller, name)
	{
		// toto zabranuje zlovolnemu nastavovani app jako this v callbacich rout
		return function()
		{
			controller[name + 'Action'].apply(controller, arguments);
		}
	}
};