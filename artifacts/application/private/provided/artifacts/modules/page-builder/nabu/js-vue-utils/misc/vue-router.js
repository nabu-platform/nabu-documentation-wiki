if (!nabu) { var nabu = {}; }
if (!nabu.components) { nabu.components = {}; }
if (!nabu.services) { nabu.services = {}; }
if (!nabu.state) { nabu.state = {}; }
if (!nabu.utils) { nabu.utils = {}; }

/*
TODO:

recursive routing:

you can add a sublist of routes to any route or you can explicitly set a "parent" on a route which is the name of another route.
the parent route must have an anchor where we can route children by default, this anchor must be defined in the route itself (default to something like route alias + "-main")
if the parent route indicated is an initial route, we do a full render

by default every route without a parent (and not initial), is assumed to have _some_ initial route which is checked for

-> how to check what is actually already routed?
	> perhaps check the dom tree parents to see what routes they already have? if parent is already routed, leave it at that

*/
nabu.services.VueRouter = function(routerParameters) {
	var self = this;
	this.components = {};
	this.router = new nabu.services.Router(routerParameters);

	this.useProps = routerParameters.useProps;
	this.route = function(alias, parameters, anchor, mask) {
		return self.router.route(alias, parameters, anchor, mask);
	}
	this.routeInitial = function(anchor) {
		return this.router.routeInitial(anchor);
	};
	this.updateUrl = this.router.updateUrl;
	this.routeAll = this.router.routeAll;
	this.bookmark = this.router.bookmark;
	this.register = function(route) {
		route = self.create(route);
		self.router.register(route);
		return route;
	};
	this.unregister = this.router.unregister;
	this.template = function(alias, parameters) {
		return self.router.template(alias, parameters);
	};
	this.get = function(alias) {
		return self.router.get(alias);
	};
	this.list = function() {
		return self.router.list();
	};
	this.create = function(route) {
		if (route.enter) {
			var originalEnter = route.enter;
			route.enter = function(anchor, parameters, mask, parentEnter) {
				var promise = new nabu.utils.promise();
				
				var render = function() {
					var component = null;
					if (originalEnter) {
						component = originalEnter(parameters, mask);
					}
					else if (route.component) {
						if (typeof(route.component) == "string") {
							component = eval(route.component);
							component = new component(self.useProps ? {propsData: parameters} : { data: parameters });
						}
						else {
							component = new route.component(self.useProps ? {propsData: parameters} : { data: parameters });
						}
					}
					var element = typeof(anchor) === "object" ? anchor : document.getElementById(anchor);
					if (!element && anchor == "body") {
						element = document.body;
					}
					return nabu.utils.vue.render({
						target: element,
						content: component,
						ready: function(component) {
							// this hook is meant for system actions, not someone defining the route
							if (route.postProcess) {
								route.postProcess(parameters, component);
							}
							// this hook is meant for people defining the route who want to do special stuff
							if (route.ready) {
								route.ready(parameters, component);
							}
							promise.resolve(component);
						},
						prepare: function(element) {
							// enrich the anchor with contextually relevant information
							element.setAttribute("route", route.alias);
							element.leave = route.leave;
						}
					});
				};
				var promises = [];
	
				// if the parent returns a promise, wait on that as well
				if (parentEnter && parentEnter.then) {
					promises.push(parentEnter);
				}
				
				// make sure we register any leaves that can object to leaving the current route
				var element = typeof(anchor) === "object" ? anchor : document.getElementById(anchor);
				if (!element && anchor == "body") {
					element = document.body;
				}
				if (element) {
					var leaver = function(element) {
						for (var i = 0; i < element.childNodes.length; i++) {
							if (element.childNodes[i].nodeType == 1) {
								leaver(element.childNodes[i]);
							}
						}
						if (element.leave) {
							var result = element.leave(element);
							if (result && result.then) {
								promises.push(result);
							}
						}
					}
					leaver(element);
				}
				
				// initialize any lazy services
				if (route.services && routerParameters.services) {
					for (var i = 0; i < route.services.length; i++) {
						var name = route.services[i].split(".");
						var target = routerParameters.services;
						for (var j = 0; j < name.length; j++) {
							if (!target) {
								throw "Could not find service: " + route.services[i];
							}
							target = target[name[j]];
						}
						if (!target) {
							throw "Could not find service '" + route.services[i] + "' for route: " + route.alias;
						}
						if (target.$lazy && !target.lazyInitialized) {
							target.lazyInitialized = new Date();
							var result = target.$lazy();
							if (result.then) {
								promises.push(result);
							}
						}
					}
				}

				new nabu.utils.promises(promises).then(function() {
					render();
				}, promise);
				return promise;
			};
		}
		var originalLeave = route.leave;
		route.leave = function(element) {
			if (element) {
				// removing this while routing to the same thing (with an activate so a delayed render)
				// means that the attribute is immediately removed (disabling styling based on it) and only reintroduced with a delay
				// this causes visual flickering
				//element.removeAttribute("route");
				delete element.leave;
			}
			if (originalLeave) {
				originalLeave(element);
			}
		};
		return route;
	};
}

