function FL_IFRAME_isExempt(nodez) {
  if (typeof CKEditor !== 'undefined')
    return true;

	var node = nodez.context;

  /*
    node.contentDocument can throw SecurityError if frame is from another domain.

    Uncaught SecurityError: Failed to read the 'contentDocument' property from 'HTMLIFrameElement':
    Blocked a frame with origin "http://www.aliexpress.com" from accessing a frame with origin "http://static.ak.facebook.com".
    The frame being accessed set "document.domain" to "facebook.com", but the frame requesting access did not.
    Both must set "document.domain" to the same value to allow access.

    TODO: investigate what spellchecker is doing with iframe

    node.contentWindow.document can be used to access content, but i'm not shure. Other uses should be updated either.
  */
  try {
    /* disable on draft.blogger.com WYSIWYG editor--too buggy */
    if (node.id == 'postingComposeBox')
      return true;

    if (node.contentDocument == undefined || node.contentDocument.body == undefined)
      return true;

    if (node.contentDocument.designMode == 'on' || node.contentDocument.body.designMode == 'on')
      return false;

    if (node.contentDocument.body.contentEditable == 'true')
      return false;

    /* hack to make editor work with Yahoo Mail immediately */
    if (/compArea/.test(node.id))
      return false;
  }catch (e) {
    if (!e instanceof DOMException || e.name != 'SecurityError')
      throw e
  }

	return true;
};

function FL_IFRAME_Proofreader(container) {
	var FL            = new FL_Proofreader(container);

	FL.setValue = function(component, value) {
		return component.context.contentDocument.body.innerHTML = value;
	};

	FL.getValue = function(component) {
		return component.context.contentDocument.body.innerHTML.replace(/\&nbsp\;/g, ' ');
	};

	FL.getCheckValue = function(component) {
		return component.context.contentDocument.body.innerHTML.replace(/\&nbsp\;/g, ' ').replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>').replace(/\&amp\;/g, '&');
	}

	/* changing/setting scroll position is handled by the injected HTML */
	FL.getScrollPosition = function() {
		/* update the relevant iframe with an */
		if (FL.isProofreading()) {
			FL.getOriginal().attr('FL_scroll', FL.getActiveComponent().scrollTop());
		}
	};

	FL.setScrollPosition = function(value) {
		/* changing the proofreading mode from proofreader -> editor */
		if (!FL.isProofreading()) {
			jQuery('body').append("<SCRIPT>FL_SCROLL_ADJUST__();</SCRIPT>");
		}
	};

	FL.adjustWidget = function(offset) {
		if (FL.isProofreading()) {
			offset.top += 4;
			offset.left += 3;
		}

		offset.top -= 1;
		offset.left -= 1;

		/* check if there is a scrollbar, if there is, adjust accordingly */
		if (FL.getOriginal().attr('id') == 'wys_frame') {
			offset.left -= 15; /* this is a google docs hack, there is always a scrollbar */
		}
		else if (FL.isProofreading()) {
			var target = FL.getActiveComponent();
			target = target.context == undefined ? target[0] : target.context;

			if (target != undefined && target.scrollHeight > target.clientHeight)
				offset.left -= 15;
		}
		else {
			var target = FL.getOriginal().context;
			if (target.contentDocument && target.contentDocument.documentElement && (target.contentDocument.documentElement.clientHeight > target.clientHeight))
				offset.left -= 15;
		}
	};

	FL.showProofreader = function(component, proofreader) {
		component.attr('FL_active', 'true');
		FL.displayValue = component.css('display');

		proofreader.css('display', 'none');
		component.after(proofreader);

		jQuery('body').append("<SCRIPT>if (typeof FL_INHERIT__ == 'undefined') { (function(l) { var res = document.createElement('SCRIPT'); res.type = 'text/javascript'; res.src = l; document.getElementsByTagName('head')[0].appendChild(res); })('"+ chrome.extension.getURL('scripts/inherit-style.js') +"'); } else { FL_INHERIT__(); }</SCRIPT>");
	};

	FL.createProofreader = function(contents) {
		return jQuery('<div><div><div id="FL_Content">' + contents + '</div></div></div>');
	};

	FL.inheritLookAndFeel = function(component, proofreader) {
		/* load a script to go in like special forces and update some styles */
		return proofreader;
	}

	return FL;
};

