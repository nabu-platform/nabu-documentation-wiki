document.addEventListener("deviceready", function () {
	document.documentElement.setAttribute("data-useragent", navigator.userAgent);
	
	// set load icon while the application is starting up
	var span = document.createElement("span");
	span.setAttribute("class", "n-icon n-icon-spinner");
	span.setAttribute("style", "position: static");
	document.body.appendChild(span);

	// the rendered language
	var currentLanguage = "${environment('currentLanguage', 'null')}";
	// the default language
	var defaultLanguage = "${environment('defaultLanguage', 'null')}";
	// the available languages
	var languages = "${environment('availableLanguages', 'null')}";
	if (languages) {
		languages = languages.split(",");
	}
	
	var chosenLanguage = new nabu.services.Cookies().get("language");
	// if we are not in the correct language, redirect
	if (chosenLanguage != null && currentLanguage != chosenLanguage && languages.indexOf(chosenLanguage) >= 0) {
		if (chosenLanguage == defaultLanguage) {
			window.open("index.html");
		}
		else {
			window.open("index-" + chosenLanguage + ".html");
		}
	}
	else {
		application.initialize().then(function($services) {
			// route to initial state
			$services.router.routeInitial();
		});
	}
});