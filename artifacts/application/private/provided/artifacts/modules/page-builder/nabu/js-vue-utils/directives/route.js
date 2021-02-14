Vue.directive("route", function(element, binding, vnode) {
	// the argument should be the name of the route, any value is passed in as parameters
	// the modifier is interpreted as the anchor to route it to
	var alias = binding.arg ? binding.arg : binding.value.alias;
	var parameters = binding.arg ? binding.value : binding.value.parameters;
	var url = vnode.context.$services.router.template(alias, parameters);
	var keys = null;
	if (binding.modifiers) {
		keys = Object.keys(binding.modifiers);
	}
	var all = keys.indexOf("all") >= 0;
	if (all) {
		keys.splice(keys.indexOf("all"), 1);
	}
	if (keys && keys.indexOf("absolute") >= 0) {
		url = "${environment('url')}" + url;
		keys.splice(keys.indexOf("absolute"), 1);
	}
	var mask = false;
	if (keys && keys.indexOf("mask") >= 0) {
		mask = true;
		keys.splice(keys.indexOf("mask"), 1);
	}
	var onclick = function(event) {
		if (!routing) {
			var anchor = null;
			if (keys && keys.indexOf("self") >= 0) {
				console.log("routing in", keys, element);
				anchor = nabu.utils.router.self(element);
			}
			else if (keys && keys.length) {
				anchor = keys[0];
			}
			routing = true;
			if (all) {
				vnode.context.$services.router.routeAll(alias, parameters, anchor, mask);
			}
			else {
				vnode.context.$services.router.route(alias, parameters, anchor, mask);
			}
			routing = false;
		}
		return false;
	};
	// make sure we don't trigger twice
	var routing = false;
	// make sure we don't do anything else
	if (element.tagName.toLowerCase() == "a") {
		element.setAttribute("href", url);
//			element.setAttribute("href", "javascript:void(0)");
		// internet explorer and edge do _not_ send out a popstate event when we change the hash with a href
		// for this reason we register an onclick that is executed before the href and returns false to stop the default href behavior
		// this gives us clean hrefs for server-side rendering / social media sharing / ... yet a functional route change in all browsers
		element.onclick = onclick;	
	}
	else {
		element.onclick = onclick;
	}
});