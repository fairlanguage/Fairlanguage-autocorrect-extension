function FL_TEXTAREA_isExempt(node) {
		
		if (node.width() == 0 || node.height() == 0)
				return true;

        // exempt hotmail to/cc/bcc fields
        if (/.*?\$[iI]nputBox/.test( node.attr('id') ))
                return true;

        // exempt the facebook status textarea, only the status textarea
        if (/UIComposer_TextArea\s/.test(node.attr('class')) && !/DOMControl_autogrow/.test(node.attr('class'))) {
                return true;
        }

        // exempt paypal checkout seller-notes area
        if (node.attr('id') == 'seller-notes')
                return true;
								
		// exempt second icon in google translate textarea
        if (node.attr('id') == 'source-is')
                return true;

  		// does not work. exempt textareas where spellcheck is false incl. Grammarly ghost editorthingy
        // if ( node.attr('id') == 'gr_ver_2')
        //       return true;

		// exclude Yahoo Mail's fields
		if (/compHeaderField/.test(node.attr('class')))
				return true;

        // exempt cPanel code editor
        if (node.attr('id') == 'codewindow')
                return true;

       	// I gues it excludes non visible textareas..
		if (node.css('display') == 'none')
				return true;

        // exempt gmail's contact fields
        if (node.context != null && node.context.ownerDocument != null && node.context.ownerDocument.location.host == 'mail.google.com' && node.context.parentNode.nodeName == 'TD')
                return true;

	return false;
};

function FL_Proofreader(container) {
	var FL            = new FL_Basic();
	var isProofreading = false;
	var proofreader    = undefined;
	var original       = undefined;
	var widget         = undefined;
	FL.displayValue   = undefined;
	FL.transition     = false;
	FL.position       = 0;
	var parent         = this;
	var hasBeenChecked = false;

	FL.hasBeenChecked = function() {
		return hasBeenChecked;
	};

	FL.getOriginal = function() {
		return original;
	};

	FL.getWidget = function() {
		return widget;
	};

	FL.adjustWidget = function(offset) {
		if (FL.isProofreading()) {
			offset.top += 4;
			offset.left += 3;
		}

		offset.top -= 6;
		offset.left -= 6;

		/* detect scrollbars and adjust proofreader position based on it */
		var target = FL.getActiveComponent();
		target = target.context == undefined ? target[0] : target.context;

		if (target != undefined && target.scrollHeight > target.clientHeight)
			offset.left -= 15;

		/* hack for WordPress comment quick edit which has a bar over the bottom */
		if (original.attr('id') == 'replycontent')
			offset.top -= 15;
	};

	FL.resizeHandler = function() {
		if (FL.transition)
			return;

		if (FL.isProofreading())
			FL.restore();
		else
			FL.getWidget().adjustWidget();
	};

	/* returns the current active component */
	FL.getActiveComponent = function() {
		if (isProofreading)
			return proofreader;
		else
			return original;
	};

	/* get/set scrollbar position */
	FL.getScrollPosition = function() {
		return FL.getActiveComponent().scrollTop();
	};

	FL.setScrollPosition = function(value) {
		FL.getActiveComponent().scrollTop(value);
	};

	var lastSync = 0;
	/* called to sync the original editor with the updated contents */
	FL.sync = function() {
		if (FL.isProofreading) {
			lastSync = new Date().getTime();
			window.setTimeout(function() {
				var current = new Date().getTime() - lastSync;
				if (current >= 1750 && FL.isProofreading && !FL.transition) {
					lastSync += current;
					var clone = jQuery(proofreader.parent().find('#FL_Content').html());
					FL._removeWords(clone, null);
					var content = clone.html();
					if (content != null)
						FL.setValue(original, content);
					lastSync = new Date().getTime();
				}
			}, 1750);
		}
	};

	/* convienence method to restore the text area from the preview div */
	FL.restore = function() {
		var options = FL.properties;

		/* check if we're in the proofreading mode, if not... then return */
		if (!isProofreading)
			return;

		FL.transition = true;

		/* get the current position, do it before isProofreading changes. */
		FL.position = FL.getScrollPosition();

		/* no longer in proofreading mode */
		isProofreading = false;

		/* swap the preview div for the textarea, notice how I have to restore the appropriate class/id/style attributes */

		FL.remove(proofreader); /* strip out the FL markup please */
		var content = proofreader.parent().find('#FL_Content').html();

		FL.setValue(original, content);

		/* clear the error HTML out of the preview div */
		proofreader.remove();

		original.css('display', FL.displayValue);
		original.attr('FL_active', null);

		/* update the scrollbar position based on the saved position */
		FL.setScrollPosition(FL.position);

		/* change the link text back to its original label */
		widget.mode("edit");

        FL.transition = false;

		widget.adjustWidget();
	};

	/* other proofreader components can override these things */
	FL.setValue = function(component, value) {
		if (value == null)
			component.val("");
		else
			component.val( value.replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>').replace(/\&amp\;/g, '&') );
	};

	FL.getCheckValue = function(component) {
		return component.val();
	}

	FL.getValue = function(component) {
		return component.val().replace(/\&/g, '&amp;').replace(/\>/g, '&gt;').replace(/\</g, '&lt;');
	};

	FL.isProofreading = function() {
		return isProofreading;
	};

	FL.bindShortcut = function(component) {
		component.bind('keydown', function(e) {
			if (e.ctrlKey && e.metaKey)
				e.metaKey = false;

			if (FL_shortcut[0] == 'true' && !e.shiftKey)
				return;

			if (FL_shortcut[1] == 'true' && !e.altKey)
				return;

			if (FL_shortcut[2] == 'true' && !e.ctrlKey)
				return;

			if (FL_shortcut[3] == 'true' && !e.metaKey)
				return;

			if (FL_shortcut[4] != e.which)
				return;

			if (FL.isProofreading()) {
				FL.restore();
				original.focus();
			}
			else {
				FL.checkComponent(component);
			}
			e.stopPropagation();
			e.preventDefault();
		});
	};

	FL.detach = function() {
		if (isProofreading)
			FL.restore();

		widget.getWidget().remove();
		original.unbind('keyup');
		original.data('FL', false);
		original.context.ownerDocument.defaultView.removeEventListener('resize', FL.resizeHandler);
	};

	FL.attach = function(component) {
		component.data("FL", true);
		original = component;

		/* attach widget */
		widget = new FL_Widget(component, this);
		widget.getWidget().click(function(event) {
			FL.checkComponent(component);
		});

		widget.adjustWidget();

		/* reset proofread mode when component is resized */
		component.context.ownerDocument.defaultView.addEventListener('resize', FL.resizeHandler, true);

		/* add a keyboard shortcut handler */
		FL.bindShortcut(component);
	};

	FL.createProofreader = function(contents) {
		return jQuery('<div id="FL_Content">' + contents + '</div>' );
	};

	FL.showProofreader = function(component, proofreader) {
		FL.displayValue = component.css('display');
		component.css('display', 'none');
		component.attr('FL_active', 'true');
		component.after(proofreader);

		/* textareas that are inline should be replaced by an inline-block div */
		if (FL.displayValue == 'inline')
			proofreader.css('display', 'inline-block');
		else
			proofreader.css('display', FL.displayValue);


		/* update the scrollbar position based on the saved position */
		FL.setScrollPosition(FL.position);
	};

	FL.inheritLookAndFeel = function(component, proofreader) {
		var css = component.context.ownerDocument.defaultView.getComputedStyle(component.context, null);

		for (var i = 0; i < css.length; i++) {
			var property = css.item(i);
			proofreader.css(property, css.getPropertyValue(property));
		}

		proofreader.css( { 'overflow' : 'auto', 'white-space' : 'pre-wrap' } );
		proofreader.attr('spellcheck', false); /* ours is better */
		proofreader.css('-webkit-user-modify', 'read-write-plaintext-only');

		return proofreader;
	}

	FL.checkSilent = function(callback) {
		/* create a proofreader */
       	var div = jQuery('<div>' + FL.getValue(container) + '</div>');
		div.data('FL', true);

		/* check the writing in the textarea */
		FL.check(div, FL.getCheckValue(container), {
			ready: function(errorCount) {
				hasBeenChecked = true;
				FL.hasErrors = errorCount > 0;
				callback(errorCount);
			},

			error: function(reason) {
				FL.hasErrors = false;
				callback(0);
			}
		});
	};

	FL.checkComponent = function() {
		/* If the text of the link says edit comment, then restore the textarea so the user can edit the text */
		if (isProofreading) {
			FL.restore();
		}
		else {
			FL.position = FL.getScrollPosition();

			/* we're now proofreading */
			isProofreading = true;

			widget.mode("proofread");

			/* disable the spell check link while an asynchronous call is in progress. if a user tries to make a request while one is in progress
			   they will lose their text. Not cool! */
			var disableClick = function() { return false; };
			widget.getWidget().click(disableClick);

			/* create a proofreader */
       		var div = FL.createProofreader(FL.getValue(container));
			div.data('FL', true);
			proofreader = FL.inheritLookAndFeel(container, div);

			/* hide the original container and insert the proofreader */
			original = container;
			FL.showProofreader(container, div);

			/* block the enter key in proofreading mode */
			// div.keypress(function (event) {
			// 	return event.keyCode != 13;
			// });

			/* tell the editor to sync as you type */
			div.keyup(function (event) {
				FL.sync();
			});

			/* bind the restore shortcut */
			FL.bindShortcut(div);

			/* tell the widget to adjust */
			widget.adjustWidget();

			/* check the writing in the textarea */
			FL.check(div.parent().find('#FL_Content'), FL.getCheckValue(container), {
				ready: function(errorCount) {
					/* this function is called when the FL async service request has finished.
					   this is a good time to allow the user to click the spell check/edit text link again. */
					widget.getWidget().unbind('click', disableClick);
					hasBeenChecked = true;
				},

				explain: function(url) {
					chrome.extension.sendRequest({ command: "open", url: url });
				},

				success: function(errorCount) {
					if (errorCount == 0)
						chrome.extension.sendRequest({ command: "alert", text: FL.getLang('message_no_errors_found', "Wir haben keine unfairen Formulierungen gefunden. Allerdings ist unser Tool noch am lernen, also falls es etwas übersehen hat: Gib gerne Bescheid.") } );

					/* once all errors are resolved, this function is called, it's an opportune time
					   to restore the textarea */
					FL.restore();
				},

				error: function(reason) {
					widget.getWidget().unbind('click', disableClick);

					if (reason == undefined)
						alert( FL.getLang('message_server_error_short', "Oh Noo! There was an error communicating with the Fairlanguage service. Feel free to get in contact with us and we will figure out what is going on.") );
					else
						alert( FL.getLang('message_server_error_short', "Oh Noo! There was an error communicating with the Fairlanguage service. Feel free to get in contact with us. Feel free to get in contact with us and we will figure out what is going on.") + "\n\n" + reason );

					/* restore the text area since there won't be any highlighted spelling errors */
					FL.restore();
				},

				ignore : function(element) {
					chrome.extension.sendRequest({ command: 'ignore', word: element });
				},

				editSelection : function(element) {
					var text = prompt( FL.getLang('dialog_replace_selection', "Replace selection with:"), element.text() );
					if (text != null) {
						jQuery(element).html( text );
						FL.core.removeParent(element);
					}
				}
			});
		}
	}
	return FL;
}
