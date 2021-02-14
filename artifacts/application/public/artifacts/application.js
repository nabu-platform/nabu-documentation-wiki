
if (!application) { var application = {} }

application.configuration = {
	scheme: {
		http: "${when(environment('secure'), 'https', 'http')}",
		ws: "${when(environment('secure'), 'wss', 'ws')}"
	},
	url: "${environment('url', 'http://127.0.0.1')}",
	host: "${environment('host', '127.0.0.1')}",
	mobile: navigator.userAgent.toLowerCase().indexOf("mobi") >= 0,
	applicationLanguage: "${applicationLanguage()}",
	requestEnrichers: []
};

application.views = {};
application.components = {};
application.definitions = {};
// a list of loaders that need to be run once the application has been initialized
application.loaders = [];

application.bootstrap = function(handler) {
	// we have already started the services bus, immediately execute the handler
	if (application.services) {
		handler(application.services);
	}
	// add it to the list of other things to be executed
	else {
		application.loaders.push(handler);
	}
};
application.initialize = function() {
	application.services = new nabu.services.ServiceManager({
		mixin: function(services) {
			Vue.mixin({
				// inject some services for use
				computed: {
					$configuration: function() { return application.configuration },
					$services: function() { return services },
					$views: function() { return application.views },
					$application: function() { return application }
				}
			});	
		},
		q: nabu.services.Q,
		cookies: nabu.services.Cookies,
		swagger: application.definitions.Swagger,
		loader: function loader($services) {
			this.$initialize = function() {
				return function(element, clazz) {
					nabu.utils.elements.clear(element);
					var span = document.createElement("span");
					span.setAttribute("class", "n-icon n-icon-spinner fa spinner" + (clazz ? " " + clazz : ""));
					span.setAttribute("style", "display: block; text-align: center");
					element.appendChild(span);
					return span;
				}
			}	
		},
		router: function router($services) {
			this.$initialize = function() {
				return new nabu.services.VueRouter({
					useParents: true,
					useProps: true,
					useHash: ${environment("mobile") == true || !nabu.web.application.Services.information(environment("webApplicationId"))/information/html5Mode},
					unknown: function(alias, parameters, anchor) {
						return $services.router.get("notFound");
					},
					authorizer: function(anchor, newRoute, newParameters) {
						if (newRoute.roles && $services.user) {
							if (newRoute.roles.indexOf("$guest") < 0 && !$services.user.loggedIn) {
								$services.vue.attemptedRoute.alias = newRoute.alias;
								$services.vue.attemptedRoute.parameters = newParameters;
								return {
									alias: "login",
									mask: true
								}
							}
							else if ($services.user.hasRole) {
								var hasRole = false;
								for (var i = 0; i < newRoute.roles.length; i++) {
									if ($services.user.hasRole(newRoute.roles[i])) {
										hasRole = true;
										break;
									}
								}
								if (!hasRole) {
									return {
										alias: "home"
									}
								}
							}
							else if (newRoute.roles.indexOf("$user") < 0 && $services.user.loggedIn) {
								return {
									alias: "home"
								}
							}
						}
						if (newRoute.actions && $services.user && $services.user.hasAction) {
							var hasAction = false;
							for (var i = 0; i < newRoute.actions.length; i++) {
								if ($services.user.hasAction(newRoute.actions[i])) {
									hasAction = true;
									break;
								}
							}
							if (!hasAction) {
								return {
									alias: $services.user.loggedIn ? "home" : "login"
								}
							}
						}
					},
					chosen: function(anchor, newRoute, newParameters) {
						if (anchor && (newRoute.slow || (newParameters != null && newParameters.slow)) && nabu && nabu.views && nabu.views.cms) {
							nabu.utils.vue.render({
								target: anchor,
								content: new nabu.views.cms.core.Loader()
							});
						}	
					},
					enter: function(anchor, newRoute, newParameters, newRouteReturn, mask) {
						if (!mask && newRoute.url) {
							$services.vue.route = newRoute.alias;
							// reset scroll
							// document.body.scrollTop = 0;
							window.scrollTo(0, 0);
						}
					}
				});
			}
		},
		vue: function vue() {
			this.$initialize = function() {
				return new Vue({
					el: "body",
					data: function() {
						return {
							route: null,
							attemptedRoute: {}
						}
					}
				});
			}
		},
		routes: application.routes,
		loaders: function($services) {
			this.$initialize = function() {
				var promises = [];
				for (var i = 0; i < application.loaders.length; i++) {
					var result = application.loaders[i]($services);
					if (result && result.then) {
						promises.push(result);
					}
				}
				return $services.q.all(promises);
			}
		}
	});
	return application.services.$initialize();
};