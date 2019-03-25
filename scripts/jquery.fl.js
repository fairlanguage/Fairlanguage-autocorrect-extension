// var consent = localStorage.getItem('fairlanguageconsent');



// Function to get users consent on data protection agreement and store it in localStorage
function Fairlanguage_noconsent(callback) {

		// confirm dialog to ask user to agree to Dataprotection agreement.
		var consentform = confirm("Huhu, die Fairlanguage Browser Extension hier!\n\nUm dir Feedback zu deinen Texten auf dieser Seite geben zu können, müssen wir diese an einen Server senden und dort analysieren. Dies passiert aktuell nur, wenn du die Extension aktivierest.\n\nMit der Nutzung stimmst du der Verarbeitung deiner Daten und unserer Datenschutzerklärung (https://www.fairlanguage.com/impressum ) ausdrücklich zu.");

		// if user clicks ok, return of consentform is true. Key 'fairlanguageconsent' is set to 'true' in localStorag
		if (consentform == true) {
		localStorage.setItem('fairlanguageconsent' , 'true');
	 	console.log('Save for yes to consent. Value in localStorage for fairlanguageconsent:', localStorage.getItem('fairlanguageconsent'), 'value for consentform:', consentform);
		// magicmagicmagic. After user has given consent, we check again.	 	
	 	callback();

		}

		// if user clicks cancel or 'x', return of consentform is false. Key 'fairlanguageconsent' is set to 'false' in localStorage.
		else if (consentform == false) {
		localStorage.setItem('fairlanguageconsent' , 'false');
	 	console.log('Save for no to consent. Value in localStorage for fairlanguageconsent:', localStorage.getItem('fairlanguageconsent'), 'value for consentform:', consentform);
		// Sorry, no fair language for you then.
		FL_proofreaders.forEach(function (proofreader) {
	 		proofreader.restore();
	 	})


		}
 	 };


function FL_Basic() {
	this.rpc = ''; /* see the proxy.php that came with the At D/TinyMCE plugin */
	this.api_key = '';
	this.i18n = {};
	this.listener = {};

	/* callbacks */

	var parent = this;
	this.clickListener = function(event) {
		if (parent.core.isMarkedNode(event.target))
			parent.suggest(event.target);
	};

	this.ignoreSuggestion = function(e) {
		parent.core.removeParent(parent.errorElement);

		parent.counter --;
		if (parent.counter == 0 && parent.callback_f != undefined && parent.callback_f.success != undefined)
			parent.callback_f.success(parent.count);
	};

	this.explainError = function(e) {
		if (parent.callback_f != undefined && parent.callback_f.explain != undefined)
			parent.callback_f.explain(parent.explainURL);
	};



	this.core = (function() {
		var core = new FLCore();

		core.hasClass = function(node, className) {
			return jQuery(node).hasClass(className);
		};

		core.map = jQuery.map;

		core.contents = function(node) {
			return jQuery(node).contents();
		};

		core.replaceWith = function(old_node, new_node) {
			return jQuery(old_node).replaceWith(new_node);
		};

		core.findSpans = function(parent) {
        		return jQuery.makeArray(parent.find('span'));
		};


		core.create = function(string) {
			// replace out all tags with &-equivalents so that we preserve tag text.
			string = string.replace(/\&/g,'&amp;');
			string = string.replace(/\</g,'&lt;').replace(/\>/g,'&gt;');

			// find all instances of FL-created spans
			var matches = string.match(/\&lt\;span class=\"hidden\w+?\" pre="[^"]*"\&gt\;.*?\&lt\;\/span\&gt\;/g);

			// ... and fix the tags in those substrings.
			if (matches) {
				matches.forEach(function(match) {
					string = string.replace(match,match.replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>'));
				},this);
			}

			var node = jQuery('<span class="mceItemHidden" spellcheck="false"></span>');
			node.html(string);
			return node;
		};

		core.remove = function(node) {
			return jQuery(node).remove();
		};

		core.removeParent = function(node) {
			/* unwrap exists in jQuery 1.4+ only. Thankfully because replaceWith as-used here won't work in 1.4 */
			if (jQuery(node).unwrap)
				return jQuery(node).contents().unwrap();
			else
				return jQuery(node).replaceWith(jQuery(node).html());
		};

		core.getAttrib = function(node, name) {
			return jQuery(node).attr(name);
		};

		return core;
	})();

	this.check = function(container, source, callback_f) {
		chrome.extension.sendRequest({ command: 'options' }, function(o) {
			parent.setIgnoreStrings(o.phrases);
			parent.showTypes(o.options);

// Data Privacy / Data Protection Consent Check. IMPORTANT! This is happening for every new site where the user wants to use the Fairlanguage Extension.
// If true (consent was given), we send the request to the server
			if (localStorage.getItem('fairlanguageconsent') == 'true') {
			parent._check(container, source, callback_f);
			console.log('Data privacy consent check for true directly after confirm:' , (localStorage.getItem('fairlanguageconsent')));
			}

// If false (consent not given), we call function 'fairlanguage_noconsent' and don't process the request. Users who don't agree are asked at next attempt to agree.
			else {
     		console.log('nothing sent to server due to missing data privacy consent. Please agree to data privacy in order to have your text checked for fair language.', localStorage.getItem('fairlanguageconsent'));
     		Fairlanguage_noconsent(function(){ parent._check(container, source, callback_f); });
     	}




	//	here the check is somehow happening, if following line is removed the application does not get a response..
	// this needs to be dependent on consent true / false.
	//	parent._check(container, source, callback_f);
	//			console.log("does this do something?????");

		});
	};

	/* redefine the communication channel */
	this._check = function(container, source, callback_f) {
		parent.callback_f = callback_f; /* remember the callback for later */
		parent.remove(container);
		console.log("this is called after .check");

		var text     = jQuery.trim(source);

		chrome.extension.sendRequest({ data: text, url: '/checkDocument' }, function(response) {
			var xml = (new DOMParser()).parseFromString(response, 'text/xml');

			/* check for and display error messages from the server */
			if (parent.core.hasErrorMessage(xml)) {
				if (parent.callback_f != undefined && parent.callback_f.error != undefined)
					parent.callback_f.error(parent.core.getErrorMessage(xml));

				return;
			}

			/* highlight the errors */

			parent.container = container;

			var count = parent.processXML(container, xml);

			if (parent.callback_f != undefined && parent.callback_f.ready != undefined)
				parent.callback_f.ready(count);

			if (count == 0 && parent.callback_f != undefined && parent.callback_f.success != undefined)
				parent.callback_f.success(count);

			parent.counter = count;
			parent.count   = count;
		});
	};
}

FL_Basic.prototype.getLang = function(key, defaultk) {
	if (this.i18n[key] == undefined)
		return defaultk;

	return this.i18n[key];
};

FL_Basic.prototype.addI18n = function(localizations) {
	this.i18n = localizations;
	this.core.addI18n(localizations);
};

FL_Basic.prototype.setIgnoreStrings = function(string) {
	this.core.setIgnoreStrings(string);
};

FL_Basic.prototype.showTypes = function(string) {
	this.core.showTypes(string);
};

FL_Basic.prototype.useSuggestion = function(word) {
	this.core.applySuggestion(this.errorElement, word);
	this.counter --;
	if (this.counter == 0 && this.callback_f != undefined && this.callback_f.success != undefined)
		this.callback_f.success(this.count);
	else
		this.sync();
};

FL_Basic.prototype.remove = function(container) {
	/* destroy the menu when we remove the HTML */
	if (this.lastSuggest)
		this.lastSuggest.remove();
	this.lastSuggest = undefined;

	this._removeWords(container, null);
};

FL_Basic.prototype.processXML = function(container, responseXML) {

	var results = this.core.processXML(responseXML);

	if (results.count > 0)
		results.count = this.core.markMyWords(container.contents(), results.errors);

	container.unbind('click', this.clickListener);
	container.click(this.clickListener);

	return results.count;
};

FL_Basic.prototype.editSelection = function() {
	var parent = this.errorElement.parent();

	if (this.callback_f != undefined && this.callback_f.editSelection != undefined)
		this.callback_f.editSelection(this.errorElement);

	if (this.errorElement.parent() != parent) {
		this.counter --;
		if (this.counter == 0 && this.callback_f != undefined && this.callback_f.success != undefined)
			this.callback_f.success(this.count);
	}
};

FL_Basic.prototype.ignoreAll = function(container) {
	var target = this.errorElement.text();
	var removed = this._removeWords(container, target);

	this.counter -= removed;

	if (this.counter == 0 && this.callback_f != undefined && this.callback_f.success != undefined)
		this.callback_f.success(this.count);

	if (this.callback_f != undefined && this.callback_f.ignore != undefined) {
		this.callback_f.ignore(target);
		this.core.setIgnoreStrings(target);
	}
};

FL_Basic.prototype.suggest = function(element) {
	var parent = this;

	/* construct the menu if it doesn't already exist */

	var suggest = jQuery('<div class="suggestmenu"></div>');
	suggest.prependTo('body');

	/* make sure there is only one menu at a time */

	if (parent.lastSuggest)
		parent.lastSuggest.remove();

	parent.lastSuggest = suggest;

	/* find the correct suggestions object */

	errorDescription = this.core.findSuggestion(element);

	/* build up the menu y0 */

	this.errorElement = jQuery(element);

	suggest.empty();

	if (errorDescription == undefined) {
		suggest.append('<strong>' + this.getLang('menu_title_no_suggestions', 'No suggestions') + '</strong>');
	}
	else if (errorDescription["suggestions"].length == 0) {
		suggest.append('<strong>' + errorDescription['description'] + '</strong>');
	}
	else {
		suggest.append('<strong>' + errorDescription['description'] + '</strong>');

		var parent = this;
		for (var i = 0; i < errorDescription["suggestions"].length; i++) {
			(function(sugg) {
				var node = jQuery('<div>' + sugg + '</div>');
				node.click(function(e) {
					parent.useSuggestion(sugg);
					suggest.remove();
					e.preventDefault();
					e.stopPropagation();
				});
				suggest.append(node);
			})(errorDescription["suggestions"][i]);
		}
	}

	/* do the explain menu if configured */

	if (this.callback_f != undefined && this.callback_f.explain != undefined && errorDescription['moreinfo'] != undefined) {
		var node = jQuery('<div class="spell_sep_top">' + this.getLang('menu_option_explain', 'Warum ist das unfair?') + '</div>');
		node.click(function(e) {
			parent.explainError();
			suggest.remove();
			e.preventDefault();
			e.stopPropagation();
		});
		suggest.append(node);
		this.explainURL = errorDescription['moreinfo'];
	}

	{
		var node = jQuery('<div class="spell_sep_top">' + this.getLang('add_unfair_word', 'Unfaires Wort hinzufügen') + '</div>');
		node.click(function(e) {
		window.open('https://docs.google.com/forms/d/e/1FAIpQLSd1GIBT31ohUqDAe8xX9KTKGt0CbHO4Y07wHJgQFuZx-iIJ-w/viewform?usp=sf_link',
  '_blank'
);
		});
		suggest.append(node);
	}


	/* do the ignore option */
	//
	// var node = jQuery('<div class="spell_sep_top">' + this.getLang('menu_option_ignore_once', 'Ignore suggestion') + '</div>');
	// node.click(function(e) {
	// 	parent.ignoreSuggestion();
	// 	suggest.remove();
	// 	e.preventDefault();
	// 	e.stopPropagation();
	// });
	// suggest.append(node);
	//
	// /* add the edit in place and ignore always option */
	//
	// if (this.callback_f != undefined && this.callback_f.editSelection != undefined) {
	//
	// 	if (this.callback_f != undefined && this.callback_f.ignore != undefined)
	// 		node = jQuery('<div>' + this.getLang('menu_option_ignore_always', 'Ignore always') + '</div>');
	// 	else
	// 		node = jQuery('<div>' + this.getLang('menu_option_ignore_all', 'Ignore all') + '</div>');
	//
	// 	suggest.append(node);
	//
	// 	var node2 = jQuery('<div class="spell_sep_bottom spell_sep_top">' + this.getLang('menu_option_edit_selection', 'Edit Selection...') + '</div>');
	// 	node2.click(function(e) {
	// 		parent.editSelection(parent.container);
	// 		suggest.remove();
	// 		e.preventDefault();
	// 		e.stopPropagation();
	// 	});
	// 	suggest.append(node2);
	// }
	// else {
	// 	if (this.callback_f != undefined && this.callback_f.ignore != undefined)
	// 		node = jQuery('<div class="spell_sep_bottom">' + this.getLang('menu_option_ignore_always', 'Ignore always') + '</div>');
	// 	else
	// 		node = jQuery('<div class="spell_sep_bottom">' + this.getLang('menu_option_ignore_all', 'Ignore all') + '</div>');
	// 	suggest.append(node);
	// }

	// node.click(function(e) {
	// 	parent.ignoreAll(parent.container);
	// 	suggest.remove();
	// 	e.preventDefault();
	// 	e.stopPropagation();
	// });

	/* show the menu */

	var pos = jQuery(element).offset();
	var width = jQuery(element).width();
	jQuery(suggest).css({ left: (pos.left + width) + 'px', top: pos.top + 'px' });

	jQuery(suggest).show();

	/* bind events to make the menu disappear when the user clicks outside of it */

	this.suggestShow = true;
	setTimeout(function() {
		jQuery("body").bind("click", function() {
			if (!parent.suggestShow)
				suggest.remove();
		});
	}, 1);

	setTimeout(function() {
		parent.suggestShow = false;
	}, 10);
};

FL_Basic.prototype._removeWords = function(container, w) {
	return this.core.removeWords(container, w);
};


