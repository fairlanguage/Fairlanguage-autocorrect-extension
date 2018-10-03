function FL_DIV_isExempt(node) {
	if (node.attr('contentEditable') != 'true' && node.attr('contenteditable') != 'true')
		return true;

        /* disable on small editable divs */
        if (node.height() < 24)
		return true;

	/* exclude GMail task list */
	if (node.attr('class') == 'EY')
		return true;

	if (node.attr('id') == 'FL_Content')
		return true;

	/* webkit likes to use divs for new paragraphs, verify this isn't one of those */
	if (node.closest('#FL_Content').attr('id') == 'FL_Content')
		return true;

	return false;
};

function FL_DIV_Proofreader(container) {
	var FL            = new FL_Proofreader(container);

	FL.setValue = function(component, value) {
		component.html( value );
	};

	FL.getCheckValue = function(component) {
		return component.html().replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>').replace(/\&amp\;/g, '&');
	}

	FL.getValue = function(component) {
		return component.html();
	};

	FL.adjustWidget = function(offset) {
		if (FL.isProofreading()) {
			offset.top += 6;
			offset.left += 5;
		}
		else {
			offset.top += 2;
			offset.left += 2;
		}

		/* check if our div has a scrollbar or not */
		var target = FL.getActiveComponent();
		target = target.context == undefined ? target[0] : target.context;

		if (target != undefined && target.scrollHeight > target.clientHeight)
			offset.left -= 15;
	};

	return FL;
};

