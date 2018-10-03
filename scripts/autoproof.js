function FL_form_handler(e) {
	if (!FL_autoproof)
		return;

	/* ignore Facebook's "view all N comments" link which is really a form submit, same for like, unlike, and friends */
	if (e.explicitOriginalTarget != undefined) {
		var name = e.explicitOriginalTarget.name;
		if (name == 'view_all' || name == 'like' || name == 'unlike' || name == 'share')
			return;
	}

	/* we've already warned the user or they've already checked their stuff */
	if (jQuery(e.target).data('FL_Warned') == true)
		return;

	jQuery(e.target).data('FL_Warned', true);

	/* find all proofreaders that have this form as a descendant */
	var form = jQuery(e.target).closest('form');
	if (form == undefined)
		return;

	var checkme = [];
	for (var x = 0; x < FL_proofreaders.length; x++) {
		if (!FL_proofreaders[x].hasBeenChecked() && FL_proofreaders[x].getOriginal().closest('form')[0] == form[0])
			checkme.push(FL_proofreaders[x]);
	}

	var totalErrors = 0;

	/* this function continues the process of submitting the form (if necessary) */
	var finalize = function() {
		if (totalErrors == 0 || confirm("Fairlanguage detected errors which you have not reviewed. Press OK to submit the form, or Cancel to review the errors.")) {
			window.setTimeout(function() {
				jQuery(e.target).click();
			}, 10);
		}
		else {
			for (var x = 0; x < checkme.length; x++) {
				if (checkme[x].hasErrors)
					checkme[x].checkComponent();
			}
		}
	};

	/* check them please */
	if (checkme.length > 0) {
		var total = checkme.length;
		var callback = function(count) {
			total -= 1;
			totalErrors += count;
			if (total == 0)
				finalize();
		};

		e.preventDefault();
		e.stopPropagation();

		for (var x = 0; x < checkme.length; x++) {
			checkme[x].checkSilent(callback);
		}
	}
};
