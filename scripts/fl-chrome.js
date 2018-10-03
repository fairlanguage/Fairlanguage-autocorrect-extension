var FL_proofreaders = [];
var FL_shortcut, FL_auto;

jQuery.fn.addProofreader = function(options) {
	this.id = 0;

	var parent = this;
	var opts = jQuery.extend({}, {}, options);
	var ids = {};

	return this.each(function() {
		$this = jQuery(this);

		if ($this.data('FL') == true || $this.css('display') == 'none')
			return;

		var proofreader = undefined;
		if ($this.context.tagName == 'DIV' && FL_DIV_isExempt($this) == false) {
			proofreader = FL_DIV_Proofreader($this);
		}
		else if ($this.context.tagName == 'IFRAME' && FL_IFRAME_isExempt($this) == false) {
			proofreader = FL_IFRAME_Proofreader($this);
		}
		else if ($this.context.tagName == 'TEXTAREA' && FL_TEXTAREA_isExempt($this) == false) {
			proofreader = new FL_Proofreader($this);
		}

		if (proofreader != undefined) {
			proofreader.attach($this);
			FL_proofreaders.push(proofreader);

			/* attach a submit listener to the parent form */
			$this.parents('form').submit(function(event) {
				proofreader.restore();
			});
		}
	});
};

var last = new Date().getTime();
function doItLater(thefunction) {
	window.setTimeout(function() {
		var now = new Date().getTime();
		if ((now - last) >= 1000) {
			thefunction();
			last = now;
		}
	}, 1000);
};

function FL_handler(event) {
	doItLater(function() {
		jQuery('textarea').addProofreader();
		jQuery('div').addProofreader();
		jQuery('iframe').addProofreader();

		for (var x = 0; x < FL_proofreaders.length; x++) {
			if (FL_proofreaders[x].getWidget() != undefined)
				FL_proofreaders[x].getWidget().adjustWidget();
		}
	});
};

function toFLHost(url) {
	var host = new RegExp('(https{0,1}://.*?)/.*').exec(url);
	if (host == null)
		host = url;
	else
		host = host[1];
	return host;
}

function FL_start() {

	chrome.extension.sendRequest({ command: 'options' }, function(o) {
		var enabled = true;

/* check if this is an ignored site... if it is, return */
		if (document.location) {
			var current = toFLHost(document.location.href);
			var sites = o['sites'].split(/,\s+/);
			for (var x = 0; x < sites.length; x++) {
				if (sites[x] != '' && current == sites[x])
					enabled = false;
			}
//not sure if this check actually works..
				if (current == 'http://acid3.acidtests.org' || current == 'https://trello.com' || current == 'https://chrome.google.com' || current == 'https://spreadsheets.google.com' || current == 'http://spreadsheets.google.com' || current == 'https://docs.google.com' )
				enabled = false;
		}

		FL_shortcut  = o.shortcut.split(/,/);
		FL_autoproof = o.auto == 'true' ? true : false;

		if (enabled)
			FL_enable();
		else
			FL_disable();
	});
}

function FL_disable() {
	jQuery(document).unbind('DOMNodeInserted', FL_handler);
	jQuery(document).unbind('DOMSubtreeModified', FL_handler);
	jQuery('input[type="submit"], input[type="image"], button[type="submit"]').die('click', FL_form_handler);

	/* make sure the Fairlanguage shortcut responds to nothing */
	FL_shortcut = [false, false, false, false, false];
	FL_autoproof = false;

	/* kill the proofreaders, eh :) */
	for (var x = 0; x < FL_proofreaders.length; x++) {
		FL_proofreaders[x].detach();
	}

	FL_proofreaders = [];
}

function FL_enable() {
	jQuery('textarea').addProofreader();
	jQuery('div').addProofreader();
	jQuery('iframe').addProofreader();

	jQuery('input[type="submit"], input[type="image"], button[type="submit"]').live('click', FL_form_handler);

	jQuery(document).bind('DOMNodeInserted', FL_handler);
	jQuery(document).bind('DOMSubtreeModified', FL_handler);

	jQuery('body').append("<LINK REL='stylesheet' type='text/css' media='screen' href='" + chrome.extension.getURL('css/fl.css') + "' />");
}

chrome.extension.onRequest.addListener(function(command) {
	FL_start();
});

/* delay loading Fairlanguage Extension on to a new page, some sites (e.g., gmail) mess up randomly if this happens too quickly */
var FL_load_wait;
if (window.document != null && window.document.location != null && window.document.location.host == 'mail.google.com')
	FL_load_wait = 2000;
else
	FL_load_wait = 250;

window.setTimeout(function() {
	FL_start();
}, FL_load_wait);

