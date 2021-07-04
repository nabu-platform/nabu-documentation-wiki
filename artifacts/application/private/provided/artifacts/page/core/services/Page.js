if (!nabu) { var nabu = {} };
if (!nabu.page) { nabu.page = {}}

nabu.page.provide = function(spec, implementation) {
	if (!nabu.page.state) {
		nabu.page.state = { providers: [] }
	}
	if (!nabu.page.state.providers[spec]) {
		nabu.page.state.providers[spec] = [];
	}
	nabu.page.state.providers[spec].push(implementation);
}

nabu.page.providers = function(spec) {
	return nabu.page.state && nabu.page.state.providers[spec] ? nabu.page.state.providers[spec] : [];
}

nabu.page.instances = {};

nabu.services.VueService(Vue.extend({
	services: ["swagger", "user", "cookies"],
	data: function() {
		return {
			mouseX: 0,
			mouseY: 0,
			counter: 1,
			title: null,
			home: null,
			homeUser: null,
			pages: [],
			loading: true,
			// application properties
			properties: [],
			environmentProperties: [],
			// the devices for this application
			devices: [],
			// application styles
			styles: [],
			// templates available for use
			templates: [],
			// full page templates that are available for use
			pageTemplates: [],
			// functions
			functions: [],
			// custom content
			contents: [],
			// any imports
			imports: [],
			applicationState: [],
			translations: [],
			lastCompiled: null,
			customStyle: null,
			cssStep: null,
			editable: false,
			testable: false,
			wantEdit: false,
			copiedRow: null,
			copiedCell: null,
			useEval: false,
			cssLastModified: null,
			cssError: null,
			functionError: null,
			disableReload: true,
			validations: [],
			googleSiteVerification: null,
			// the page we are editing?
			editing: null,
			dragItems: [],
			variables: {},
			geoRefusalTimeout: null,
			location: null,
			showConsole: false,
			// pages can report stuff to show in the console (mostly events)
			reports: [],
			// features that are enabled (necessary for runtime stuff)
			enabledFeatures: [],
			// when testing, you can check the available features and toggle them (either on or off)
			availableFeatures: [],
			toggledFeatures: [],
			// user specific settings
			users: [],
			// the drag/drop doesn't work very well in javafx webview?
			dragTypes: [],
			inspectContent: null,
			consoleTab: null,
			branding: {},
			// the current branding can be a combination of core branding and localized branding
			currentBranding: {},
			defaultLocale: null,
			copiedType: null,
			copiedContent: null
		}
	},
	activate: function(done) {
		var self = this;
		// non-reactive
		this.pageCounter = 0;
		document.title = "%{Loading...}";
		window.addEventListener("paste", function(event) {
			if (self.canEdit()) {
				var data = event.clipboardData.getData("text/plain");
				if (data) {
					try {
						var parsed = JSON.parse(data);
						if (parsed && parsed.type == "page-row") {
							self.copiedRow = parsed.content;
						}
						else if (parsed && parsed.type == "page-cell") {
							self.copiedCell = parsed.content;
						}
						else if (parsed.type && parsed.content) {
							self.copiedType = parsed.type;
							self.copiedContent = parsed.content;
						}
					}
					catch (exception) {
						// ignore
					}
				}
			}
		});
		window.addEventListener("keydown", function(event) {
			//192 in firefox and 222 in chrome?
			if (self.canEdit() && (event.code == "Backquote" || event.which == 121)) {
				self.showConsole = !self.showConsole;
			}
		});
		this.isServerRendering = navigator.userAgent.match(/Nabu-Renderer/);
		this.$services.swagger.offlineHandler = function() {
			// if you have permission to still view the application while offline (e.g. tester), you shouldn't end up here anyway
			// so we don't check the canTest()!
			setTimeout(function() {
				self.$services.router.route("offline");
			}, 1);
		}
		this.activate(done, true);
	},
	clear: function(done) {
		Object.keys(nabu.page.instances).forEach(function(key) {
			nabu.page.instances[key].emit("$clear", {});	
		});
		this.activate(done ? done : function() {}, false);
	},
	computed: {
		enumerators: function() {
			var providers = {};
			nabu.page.providers("page-enumerate").map(function(x) {
				providers[x.name] = x;
			});
			return providers;
		},
		isSsr: function() {
			return navigator.userAgent.match(/Nabu-Renderer/);
		}
	},
	created: function() {
		var self = this;
		document.addEventListener("keydown", function(event) {
			if (event.ctrlKey && event.altKey && event.keyCode == 88) {
				if (self.canEdit()) {
					self.wantEdit = !self.wantEdit;
				}
				else {
					self.$services.router.route("login", null, null, true);
				}
			}
		});
	},
	methods: {
		pasteItem: function(item) {
			var content = null;
			if (this.isCopied(item)) {
				content = this.copiedContent;
				this.copiedContent = null;
				this.copiedType = null;
			}	
			return content;
		},
		// whether or not this type of item is in the "clipboard"
		isCopied: function(item) {
			return this.copiedType == item;
		},
		// copy it to the clipboard
		copyItem: function(item, content) {
			nabu.utils.objects.copy({
				type: item,
				content: content
			});
			this.copiedType = item;
			this.copiedContent = content;
		},
		suggestDevices: function(value) {
			var devices = this.devices.map(function(x) { return x.name }); 
			if (value && value.match(/[0-9]+/)) { 
				devices.unshift(value) 
			}
			return devices;
		},
		isDevice: function(devices) {
			var actual = this.$services.resizer.width;
			for (var i = 0; i < devices.length; i++) {
				if (devices[i].operator && devices[i].name) {
					var operator = devices[i].operator;
					var width = 0;
					if (devices[i].name.match(/[0-9]+/)) {
						width = parseInt(devices[i].name);
					}
					else {
						var device = this.devices.filter(function(x) { return x.name == devices[i].name })[0];
						if (device && device.width) {
							width = parseInt(device.width);
						}
						// the default devices!
						else if (device && !device.width && device.name == "desktop") {
							width = 1280;
						}
						else if (device && !device.width && device.name == "tablet") {
							width = 960;
						}
						else if (device && !device.width && device.name == "phone") {
							width = 512;
						}
					}
					// infinitely big, so matches any query requesting larger
					if (width == 0) {
						if (operator != ">" && operator != ">=") {
							return false;
						}
					}
					else if (operator == "<" && actual >= width) {
						return false;
					}
					else if (operator == "<=" && actual > width) {
						return false;
					}
					else if (operator == ">" && actual <= width) {
						return false;
					}
					else if (operator == ">=" && actual < width) {
						return false;
					}
					else if (operator == "==" && actual != width) {
						return false;
					}
				}
			}
			return true;
		},
		getLocale: function() {
			// does the user have an explicitly chosen locale?
			// TODO
			if (this.defaultLocale) {
				return this.defaultLocale;
			}
			else if (navigator.language) {
				return navigator.language;
			}
			// IE
			else if (navigator.userLanguage) {
				return navigator.userLanguage;
			}
			// also IE
			else if (navigator.browserLanguage) {
				return navigator.browserLanguage;
			}
			// default
			else {
				return "en-US";
			}
		},
		mergeObject: function(into, from) {
			var keys = [];
			Object.keys(from).forEach(function(key) {
				if (into[key] instanceof Array && from[key] instanceof Array) {
					into[key].splice(0);
					nabu.utils.arrays.merge(into[key], from[key]);
				}
				else {
					Vue.set(into, key, from[key]);
				}
				keys.push(key);
			});
			// delete the current keys
			Object.keys(into).forEach(function(key) {
				if (keys.indexOf(key) < 0) {
					into[key] = null;
					delete into[key];
				}
			});
		},
		showContent: function(content) {
			this.inspectContent = content;
			this.consoleTab = "inspect";
			this.showConsole = true;
		},
		download: function(url, errorHandler) {
			// use iframes to better handle problems when they occur (e.g. a 500)
			var iframe = iframe = document.createElement('iframe');
			iframe.setAttribute("class", "hiddenDownloader");
			iframe.style.visibility = 'hidden';
			iframe.style.width = "0px";
			iframe.style.height = "0px";
			iframe.style.display = 'none';
			// firefox only triggers this in case we get an error document back
			// chrome always triggers this, even _before_ the download is complete, if we remove the iframe at that point from the DOM, the download fails
			// so we leave the iframe in the DOM at this point
			// we have very few ways to check if the downloaded was successful or not, but we can try to inspect the body of the iframe (its from the same origin) and determine based on the content there
			iframe.onload = function(event) {
				var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
				// no body or an empty body means it loaded ok!
				if (iframeDocument && (!iframeDocument.body || iframeDocument.body.innerHTML == "")) {
					console.log("File downloaded correctly", url);
				}
				else {
					console.log("file download failed", url);
					if (errorHandler) {
						errorHandler(url);
					}
				}
			}
			// this is never triggered in any browser :(
			iframe.onerror = function(event) {
				console.log("failed!", event);
			}
			document.body.appendChild(iframe);
			if (this.$services.language != null && this.$services.language.current != null) {
				if (url.indexOf("?") <= 0) {
					url += "?language=" + this.$services.language.current;
				}
				else {
					url += "&language=" + this.$services.language.current;
				}
			}
			iframe.src = url;
		},
		// category is a general category of reports, for example we can have "analysis" reports or "event" reports or...
		// the source is where it comes from, this is usually a page, but it could also be a service like the router, swagger,...
		// the type is the general type of the report, for example a click event
		// the name is the specific name of this report, for example a specific event
		// properties can be anything
		report: function(category, source, type, name, properties) {
			if (this.canEdit()) {
				this.reports.unshift({
					category: category,
					source: source,
					type: type,
					name: name,
					timestamp: new Date(),
					properties: properties
				});
				this.limitReports();
			}
		},
		limitReports: function() {
			// if the console is hidden, we want to keep some recent entries but not everything
			if (this.reports.length >= 20 && !this.showConsole) {
				this.reports.splice(20);
			}
		},
		getIconHtml: function(icon) {
			var providers = nabu.page.providers("page-icon");
			providers.sort(function(a, b) {
				return a.priority - b.priority;	
			});
			var provider = providers[0];
			return provider.html(icon);
		},
		getNameColor: function(name) {
			var saturation = 80;
			var lightness = 40;
			var hash = 0;
			for (var i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash);
			}
			var hue = hash % 360;
			return 'hsl('+ hue +', '+ saturation +'%, '+ lightness +'%)';
		},
		closeRight: function() {
			var right = document.querySelector("#n-sidebar-right-instance");
			if (right && right.__vue__ && right.__vue__.close) {
				right.__vue__.close();
			}
			else if (right && right.$$close) {
				right.$$close();
			}
		},
		clearAllDrag: function() {
			this.clearDrag();
			console.log("-----------> clearing drag");
			this.dragTypes.splice(0);
		},
		clearDrag: function() {
			this.dragItems.splice(0).forEach(function(x) {
				x.classList.remove("hover-bottom", "hover-top", "hovering", "hover-left", "hover-right");
			});
		},
		// this should work both in regular browers and javafx webview where the drag events are more or less messed up
		setDragData: function(e, type, value) {
			console.log("-> setting drag data", type, value);
			if (e && e.dataTransfer && e.dataTransfer.setData) {
				event.dataTransfer.setData(type, value);
			}
			this.dragTypes.push({type: type, value: value});
		},
		hasDragData: function(event, type) {
			if (type == "operation" && event && event.dataTransfer && event.dataTransfer.data && event.dataTransfer.data.service) {
				return true;
			}
			return (event && event.dataTransfer && event.dataTransfer.types && event.dataTransfer.types.indexOf(type) >= 0)
				|| this.dragTypes.filter(function(x) { return x.type == type }).length > 0;
		},
		getDragData: function(event, type) {
			var value = event && event.dataTransfer && event.dataTransfer.getData ? event.dataTransfer.getData(type) : null;
			if (!value && type == "operation" && event && event.dataTransfer && event.dataTransfer.data && event.dataTransfer.data.service) {
				value = event.dataTransfer.data.service;
			}
			if (!value) {
				value = this.dragTypes.filter(function(x) { return x.type == type })[0];
				if (value) {
					value = value.value;
				}
			}
			return value;
		},
		pushDragItem: function(item) {
			this.clearDrag();
			this.dragItems.push(item);
		},
		parseValue: function(value) {
			if (value == null || value == "null") {
				 return null;
			}
			else if (value === "true") {
				return true;
			}
			else if (value === "false") {
				return false;
			}
			else if (value.match && value.match(/^[0-9]+$/)) {
				return parseInt(value);
			}
			else if (value.match && value.match(/^[0-9.]+$/)) {
				return parseFloat(value);
			}
			return value;
		},
		isClickable: function(element) {
			if (element.classList && element.classList.contains("clickable")) {
				return true;
			}
			else if (element.classList && element.classList.contains("unclickable")) {
				return false;
			}
			else if (element.parentNode) {
				return this.isClickable(element.parentNode);
			}
			else {
				return true;
			}
		},
		getAvailableTypes: function(value) {
			var types = ['string', 'boolean', 'number', 'integer'];
			nabu.utils.arrays.merge(types, Object.keys(this.$services.swagger.swagger.definitions));
			if (value) {
				types = types.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return types;
		},
		getContent: function(page, key) {
			// if we are in development mode and no explicit language choice is made, don't show the contents, you want the json values
			if (${environment("development")} && (!this.$services.language || !this.$services.language.cookieValue)) {
				return null;
			}
			return this.contents.filter(function(x) {
				// if it is a different page we are not interested
				if (page && x.page != page) {
					return false;
				}
				// if we want a global content, don't take a page content
				else if (!page && x.page) {
					return false;
				}
				else {
					return x.key == key;
				}
			})[0];
		},
		formatFieldsLight: function(value, fields) {
			for (var i = 0; i < fields.length; i++) {
				
			}
		},
		activate: function(done, initial) {
			var self = this;
		
			var injectJavascript = function() {
				var promise = self.$services.q.defer();
			
				if (navigator.userAgent.indexOf("Trident") >= 0) {
					promise.resolve();
				}
				else {
					// inject some javascript stuff if we are in edit mode
					//self.inject("https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.js");
					// inject ace editor
					// check out https://cdnjs.com/libraries/ace/
					// if it fails, we ignore it and set editing to false
					// too many whitelist issues getting this from CDN, let's just ship it
					/*
					self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js", function() {
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/mode-scss.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/mode-javascript.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/mode-html.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-language_tools.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-whitespace.js");
						promise.resolve();
						// inject sass compiler (no longer used)
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.js", function() {
							self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.worker.js", function() {
								promise.resolve();
							});
						});
					}, function() {
						self.editable = false;
						promise.resolve();
					});
					*/
					self.inject("${server.root()}resources/cdn/ace/1.3.3/ace.js", function() {
						self.inject("${server.root()}resources/cdn/ace/1.3.3/mode-scss.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/mode-javascript.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/mode-html.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/ext-language_tools.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/ext-whitespace.js");
						promise.resolve();
						// inject sass compiler
						/*self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.js", function() {
							self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.worker.js", function() {
								promise.resolve();
							});
						});*/
					}, function() {
						self.editable = false;
						promise.resolve();
					});
				}
				return promise;
			}
	
			self.$services.swagger.execute("nabu.web.page.core.rest.configuration.get").then(function(configuration) {
				self.editable = configuration.editable;
				self.testable = configuration.testable;
				self.pages.splice(0, self.pages.length);
				self.properties.splice(0, self.properties.length);
				self.environmentProperties.splice(0);
				self.devices.splice(0, self.devices.length);
				self.contents.splice(0);
				self.translations.splice(0);
				self.enabledFeatures.splice(0);
				self.availableFeatures.splice(0);
				self.toggledFeatures.splice(0);
				self.users.splice(0);
				self.defaultLocale = configuration.defaultLocale;
				if (configuration.branding) {
					Vue.set(self, "branding", configuration.branding);
				}
				else {
					Vue.set(self, "branding", {});
				}
				if (configuration.pages) {
					nabu.utils.arrays.merge(self.pages, configuration.pages);
					self.loadPages(self.pages);
				}
				if (configuration.properties) {
					nabu.utils.arrays.merge(self.properties, configuration.properties);
				}
				if (configuration.environmentProperties) {
					nabu.utils.arrays.merge(self.environmentProperties, configuration.environmentProperties);
				}
				if (configuration.devices) {
					nabu.utils.arrays.merge(self.devices, configuration.devices);
				}
				self.ensureDevices();
				if (configuration.title) {
					self.title = configuration.title;
				}
				if (configuration.home) {
					self.home = configuration.home;
				}
				if (configuration.homeUser) {
					self.homeUser = configuration.homeUser;
				}
				if (configuration.users) {
					nabu.utils.arrays.merge(self.users, configuration.users);
				}
				if (configuration.contents) {
					nabu.utils.arrays.merge(self.contents, configuration.contents);
				}
				if (configuration.translations) {
					var decode = function(value) {
						return value.replace(/\\n/g, "\n")
							.replace(/\\"/g, '"');
					}
					nabu.utils.arrays.merge(self.translations, configuration.translations.map(function(x) {
						// configurations are picked up directly from JSON files which have encoded properties
						// so if you were to type a linefeed into a json file, it would become \n, get picked up as such and appear in the translation
						// however, we can't match an encoded \n with an actual linefeed character
						// so we decode it here, currently it is a whitelist of encoded properties
						if (x && x.translation && x.name) {
							x.name = decode(x.name);
							// we assume the user copied the encoded characters
							x.translation = decode(x.translation);
						}
						return x;
					}));
				}
				if (configuration.imports) {
					nabu.utils.arrays.merge(self.imports, configuration.imports);
				}
				if (configuration.state) {
					nabu.utils.arrays.merge(self.applicationState, configuration.state);
				}
				if (configuration.googleSiteVerification) {
					self.googleSiteVerification = configuration.googleSiteVerification;
				}
				if (configuration.geoRefusalTimeout != null) {
					self.geoRefusalTimeout = configuration.geoRefusalTimeout;
				}
				if (self.home || self.homeUser) {
					self.registerHome(self.home, self.homeUser);
				}
				if (configuration.enabledFeatures) {
					nabu.utils.arrays.merge(self.enabledFeatures, configuration.enabledFeatures);
				}
				if (self.geoRefusalTimeout != null && navigator.geolocation) {
					var refused = self.$services.cookies.get("geolocation-refused");
					if (!refused) {
						navigator.geolocation.getCurrentPosition(
							function (position) {
								Vue.set(self, "location", position.coords);
								// update if necessary
								var watchId = navigator.geolocation.watchPosition(function(position) {
									Vue.set(self, "location", position.coords);
								});
								// could cancel the watchid at a later point?
								// navigator.geolocation.clearWatch(watchId);
							},
						// the user may not have given permission?
						function(error) {
							// if the user denied it, set a cookie to remember this for a while
							if (error.code == error.PERMISSION_DENIED && self.geoRefusalTimeout) {
								self.$services.cookies.set("geolocation-refused", "true", self.geoRefusalTimeout);
							}
						});
					}
				}
				if (self.googleSiteVerification) {
					var meta = document.createElement("meta");
					meta.setAttribute("name", "google-site-verification");
					meta.setAttribute("content", self.googleSiteVerification);
					document.head.appendChild(meta);
				}
				// don't do imports for server rendering, they should not be critical to the page and might not be parseable
				if (!navigator.userAgent.match(/Nabu-Renderer/)) {
					self.imports.forEach(function(x) {
						if (x.type == 'javascript') {
							self.inject(self.interpret(x.link), function() {}, function() {}, x.async);
						}
					});
				}
				var promises = [];
				if (self.canEdit()) {
					promises.push(injectJavascript());
					promises.push(self.$services.swagger.execute("nabu.web.page.core.rest.style.list").then(function(list) {
						if (list && list.styles) {
							nabu.utils.arrays.merge(self.styles, list.styles);
						}
					}));
					promises.push(self.$services.swagger.execute("nabu.web.page.core.rest.function.list").then(function(list) {
						if (list && list.styles) {
							nabu.utils.arrays.merge(self.functions, list.styles.map(function(x) { return JSON.parse(x.content) }));
						}
					}));
					promises.push(self.$services.swagger.execute("nabu.web.page.core.rest.templates.list").then(function(list) {
						if (list && list.templates) {
							list.templates.forEach(function(template) {
								try {
									var content = JSON.parse(template.content);
									if (content.type == "page") {
										self.pageTemplates.push(template);
									}
									else {
										self.templates.push(template);
									}
								}
								catch (exception) {
									console.error("Can not parse JSON", exception, template.content);
								}
							});
							//nabu.utils.arrays.merge(self.templates, list.templates);
						}
					}));
				}
				if (self.canTest()) {
					promises.push(self.$services.swagger.execute("nabu.web.page.core.rest.feature.get").then(function(features) {
						if (features) {
							if (features.enabled) {
								nabu.utils.arrays.merge(self.availableFeatures,
									features.enabled.map(function(x) { x.enabled = true; return x }));
								// not all enabled features might be in enabledFeatures, as that only looks at web application features, not broader ones
								features.enabled.forEach(function(x) {
									if (self.enabledFeatures.indexOf(x.name) < 0) {
										self.enabledFeatures.push(x.name);
									}
								});
							}
							if (features.disabled) {
								nabu.utils.arrays.merge(self.availableFeatures,
									features.disabled.map(function(x) { x.enabled = false; return x }));
							}
						}
					}));
				}
				if (self.applicationState) {
					self.applicationState.forEach(function(state) {
						if (state.name) {
							promises.push(self.$services.swagger.execute(state.operation).then(function(result) {
								Vue.set(self.variables, state.name, result);
							}));
						}
					});
				}
				self.$services.q.all(promises).then(function() {
					Vue.nextTick(function() {
						self.loading = false;
					});
					if (self.canEdit()) {
						// start reloading the css at fixed intervals to pull in any relevant changes
						setTimeout(self.reloadCss, 10000);
					}
					done();
				}, function(error) {
					var route = "error";
					error.forEach(function(x) {
						if (x && (x.status == 503 || x.status == 502)) {
							route = "offline";
						}
					});
					Vue.nextTick(function(e) {
						self.loading = false;
						// route to error once the services are done initializing
						setTimeout(function() {
							self.$services.router.route(route, null, null, route == "offline");
						}, 1);
					});
					if (self.canEdit()) {
						// start reloading the css at fixed intervals to pull in any relevant changes
						setTimeout(self.reloadCss, 10000);
					}
					done();
				});
			});
		},
		ensureDevices: function() {
			var self = this;
			var ensure = function(name, width) {
				var device = self.devices.filter(function(x) { return x.name == name})[0];
				if (device == null) {
					self.devices.push({
						name: name,
						width: width
					});
				}
				else if (device.width == null) {
					device.width = width;
				}
			}
			// we don't _need_ to set the device widths, we need to make sure the devices exist so you can choose them
			// the placeholder in the edit screen visualizes the default without hard saving it to your application
			// the default itself is set in the breakpoint injector
			ensure("phone", null); // 512
			ensure("tablet", null);	// 960
			ensure("desktop", null); // 1280
		},
		getApplicationStateNames: function(value) {
			var values = this.applicationState.filter(function(x) { return !!x.name }).map(function(x) {
				return x.name;
			});
			if (value) {
				values = values.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				})
			}
			return values;
		},
		reloadState: function(name) {
			var state = this.applicationState.filter(function(x) {
				return x.name == name;
			})[0];
			if (state && state.operation) {
				var self = this;
				return this.$services.swagger.execute(state.operation).then(function(result) {
					console.log("updated state received", result);
					Vue.set(self.variables, state.name, result);
				});
			}
			else {
				return this.$services.q.reject();
			}
		},
		renumber: function(page, entity) {
			var self = this;
			if (entity.id) {
				entity.id = page.content.counter++;
			}
			if (entity.rows) {
				entity.rows.map(function(row) {
					self.renumber(page, row);
				});
			}
			if (entity.cells) {
				entity.cells.map(function(cell) {
					self.renumber(page, cell);
				});
			}
			return entity;
		},
		saveStyle: function(style) {
			// we don't want to see any changes done by reference to the style content while the validation occurs
			// or we might include unvalidated changes
			// there is still the edge cases of for example a second validation following pretty soon after the first one, race conditioning it to return faster and the older saving later
			// effectively wiping out the last changes
			// we combat this a bit by increasing the timeout to 1s, reducing the chance of such a race
			style = nabu.utils.objects.clone(style);
			var self = this;
			this.$services.swagger.execute("nabu.page.scss.compile", {body:{content:style.content}}).then(function() {
				self.cssError = null;
				return self.$services.swagger.execute("nabu.web.page.core.rest.style.write", {name:style.name, body: {
					content: style.content
				}});
			}, function(error) {
				var parsed = error.responseText ? JSON.parse(error.responseText) : error;
				if (parsed.description) {
					self.cssError = parsed.description.replace(/[\s\S]*CompilationException:([^\n]+)[\s\S]*/g, "$1");
				}
				else {
					console.error("scss error", error);
				}
			});
		},
		getGlobalEvents: function() {
			var events = {};
			this.pages.map(function(page) {
				if (page.content.globalEvents) {
					page.content.globalEvents.map(function(event) {
						var globalName = event.globalName ? event.globalName : event.localName;
						if (globalName != null) {
							if (events[globalName] == null) {
								var properties = event.properties;
								// if we have an instance of it, we can resolve the definition "realtime"
								// for some reason this definition is sometimes wrong. it is also not in sync with the definition in json which (while outdated) is what we would expect
								// we disable this for now as the usecases are too limited to draw any conclusions
								//if (nabu.page.instances[page.content.name]) {
								//	properties = nabu.page.instances[page.content.name].getEvents()[event.localName];
								//}
								events[globalName] = properties == null ? {properties:{}} : properties;
							}
						}
					});
				}
			});
			return events;
		},
		// push global events to all pages
		emit: function(event, data, source) {
			var instances = [];
			// make sure we don't emit it again to the source page
			if (source != null) {
				instances.push(source);
			}
			Object.keys(nabu.page.instances).map(function(key) {
				var instance = nabu.page.instances[key];
				if (instances.indexOf(instance) < 0) {
					if (instance.page.content.globalEventSubscriptions) {
						var globalEvent = instance.page.content.globalEventSubscriptions.filter(function(x) {
							return x.globalName == event;
						})[0];
						if (globalEvent) {
							instance.emit(globalEvent.localName != null ? globalEvent.localName : event, data);
						}
					}
					instances.push(instance);
				}
			});
		},
		getCurrentInstance: function(component) {
			var page = null;
			while (!page && component) {
				if (component.page) {
					page = component.page;
				}
				else {
					component = component.$parent;
				}
			}
			return page ? this.getPageInstance(page, component) : null;
		},
		getPageInstanceByName: function(pageName, component) {
			var page = this.pages.filter(function(x) {
				return x.content.name == pageName;
			})[0];
			return page ? this.getPageInstance(page, component) : null;
		},
		getPageInstance: function(page, component) {
			var pageInstance = null;
			if (component && component.pageInstanceId != null) {
				pageInstance = nabu.page.instances[page.name + "." + component.pageInstanceId];
			}
			else if (component && component.$parent) {
				var parent = component.$parent;
				while (parent != null && parent.pageInstanceId == null) {
					parent = parent.$parent;
				}
				if (parent && parent.pageInstanceId != null) {
					pageInstance = nabu.page.instances[page.name + "." + parent.pageInstanceId];	
				}
			}
			if (!pageInstance && component && component.$root && component.$root.pageInstanceId != null) {
				pageInstance = nabu.page.instances[page.name + "." + component.$root.pageInstanceId];
			}
			return pageInstance ? pageInstance : nabu.page.instances[typeof(page) == "string" ? page : page.name];
		},
		setPageInstance: function(page, instance) {
			nabu.page.instances[page.name] = instance;
			if (instance.pageInstanceId != null) {
				nabu.page.instances[page.name + "." + instance.pageInstanceId] = instance;	
			}
		},
		destroyPageInstance: function(page, instance) {
			if (instance.pageInstanceId) {
				delete nabu.page.instances[page.name + "." + instance.pageInstanceId];
			}
			if (nabu.page.instances[page.name] == instance) {
				delete nabu.page.instances[page.name];
			}
		},
		// this may no longer be in use, there was a call from the page instance to this which reverted to the page instance, this has been optimized away
		// it is not clear if anyone else is using it atm, so it now points to the page method call
		destroy: function(component) {
			if (component.page && component.cell) {
				var pageInstance = this.$services.page.getPageInstance(component.page, component);
				//Vue.delete(pageInstance.components, component.cell.id, null);
				pageInstance.destroyComponent(component, component.cell);
			}
		},
		reloadSwagger: function() {
			if (!this.disableReload) {
				return this.$services.swagger.$clear();
			}
		},
		reloadCss: function() {
			this.reloadSwagger();
			var self = this;
			nabu.utils.ajax({url:"${server.root()}page/v1/api/css-modified"}).then(function(response) {
				if (response.responseText != null && !self.disableReload) {
					var date = new Date(response.responseText);
					if (!self.cssLastModified) {
						self.cssLastModified = date;
					}
					else if (date.getTime() > self.cssLastModified.getTime()) {
						// actually reload
						var links = document.head.getElementsByTagName("link");
						for (var i = 0; i < links.length; i++) {
							var original = links[i].getAttribute("original");
							if (!original) {
								original = links[i].href;
								links[i].setAttribute("original", original);
							}
							links[i].setAttribute("href", original + "&loadTime=" + date.getTime());
						}
						self.cssLastModified = date;
					}
				}
				setTimeout(self.reloadCss, 5000);
			});
		},
		getFunctionDefinition: function(id) {
			return this.listFunctionDefinitions().filter(function(x) { return x.id == id })[0];
		},
		getRunnableFunction: function(id) {
			var parts = id.split(".");
			var target = window;
			for (var i = 0; i < parts.length - 1; i++) {
				if (!target[parts[i]]) {
					target = null;
					break;
				}
				target = target[parts[i]];
			}
			var func = target == null ? null : target[parts[parts.length - 1]];	
			// if we didn't find a custom function, check provided ones
			if (!func) {
				var result = nabu.page.providers("page-function").filter(function(x) {
					return x.id == id;
				})[0];
				if (result) {
					func = result.implementation;
				}
			}
			return func;
		},
		runFunction: function(func, input, context, promise) {
			var definition = null;
			if (typeof(func) == "string") {
				definition = this.getFunctionDefinition(func);
				var id = func;
				func = this.getRunnableFunction(id);
				if (!func) {
					throw "Could not find function: " + id;
				}
			}
			var resolve = function(result) {
				if (promise) {
					promise.resolve(result);
				}
			};
			var reject = function(result) {
				if (result.responseText) {
					result = JSON.parse(result.responseText);
				}
				if (promise) {
					promise.reject(result);
				}
			};
			try {
				var returnValue = func(input, this.$services, context && context.$value ? context.$value : function() {}, resolve, reject);
				// if not async, call the done yourself
				if (definition && !definition.async) {
					resolve(returnValue);
				}
				return returnValue == null ? promise : returnValue;
			}
			catch (exception) {
				reject(exception);
				throw exception;
			}
		},
		getBindingValue: function(pageInstance, bindingValue, context) {
			var self = this;
			// only useful if the binding value is a string
			if (typeof(bindingValue) == "string") {
				while (context && !context.localState) {
					context = context.$parent;
				}
				if (context) {
					var result = this.getValue(context.localState, bindingValue);
					if (result) {
						return result;
					}
				}
			}
			// if it has a label, we have a structure object
			else if (bindingValue && bindingValue.label) {
				if (bindingValue.label == "fixed") {
					return bindingValue.value;
				}
				else if (bindingValue.label == "$function") {
					/*
					var parts = bindingValue.value.split(".");
					var target = window;
					for (var i = 0; i < parts.length - 1; i++) {
						if (!target[parts[i]]) {
							throw "Could not find function: " + bindingValue.value;
						}
						target = target[parts[i]];
					}
					var func = target[parts[parts.length - 1]];
					*/
					
					var func = this.getRunnableFunction(bindingValue.value);
					if (!func) {
							throw "Could not find function: " + bindingValue.value;
					}
					if (bindingValue.lambda) {
						return function() {
							var def = self.getFunctionDefinition(bindingValue.value);
							var input = {};
							// we map the bindings we have a value for
							if (bindingValue.bindings) {
								Object.keys(bindingValue.bindings).forEach(function(key) {
									if (bindingValue.bindings[key]) {
										var value = self.getBindingValue(pageInstance, bindingValue.bindings[key], context);
										self.setValue(input, key, value);
									}
								});
							}
							if (def.inputs) {
								var tmp = arguments;
								var counter = 0;
								def.inputs.forEach(function(x, i) {
									if (!bindingValue.bindings[x.name]) {
										input[x.name] = tmp[counter++];
									}
								});
							}
							if (def.async) {
								var promise = self.$services.q.defer();
								var promiseToReturn = promise;
								if (bindingValue.output) {
									promiseToReturn = self.$services.q.defer();
									promise.then(function(result) {
										promiseToReturn.resolve(result ? result[bindingValue.output] : result);
									}, promise);
								}
								self.runFunction(func, input, context, promise);
								return promiseToReturn;
							}
							else {
								var output = self.runFunction(func, input, context);
								if (bindingValue.output) {
									output = output[bindingValue.output];
								}
								return output;
							}
						}
					}
					var input = {};
					var self = this;
					if (bindingValue.bindings) {
						Object.keys(bindingValue.bindings).forEach(function(key) {
							if (bindingValue.bindings[key]) {
								var value = self.getBindingValue(pageInstance, bindingValue.bindings[key], context);
								self.setValue(input, key, value);
							}
						});
					}
					//var result = func(input, this.$services);
					var result = this.runFunction(func, input, context);
					if (bindingValue.output) {
						return this.getValue(result, bindingValue.output);
					}
					else {
						return result;
					}
				}
			}
			
			if (bindingValue == null) {
				return null;
			}
			var enumerators = this.enumerators;
			// allow for fixed values
			var value = bindingValue.indexOf("fixed") == 0 ? this.translate(bindingValue.substring("fixed.".length)) : (pageInstance ? pageInstance.get(bindingValue) : null);
			// if we have a fixed value that starts with a "=", interpret it
			if (bindingValue.indexOf("fixed.=") == 0) {
				value = this.interpret(value, pageInstance);
			}
			var key = bindingValue.split(".")[0];
			// allow for enumerated values, if there is a provider with that name, check it
			if (!value && enumerators[key]) {
				var label = bindingValue.substring(key.length + 1);
				var enumeration = enumerators[key].enumerate().filter(function(x) {
					return enumerators[key].label ? x[enumerators[key].label] == label : x == label;
				})[0];
				if (enumeration != null && typeof(enumeration) != "undefined") {
					value = enumerators[key].value ? enumeration[enumerators[key].value] : enumeration;
				}
			}
			return value;
		},
		translateErrorCode: function(value, defaultValue) {
			var translations = !value ? [] : this.translations.filter(function(x) {
				// this is not actually a translation, fall back to defaults
				if (x.translation == x.name) {
					return false;
				}
				return value.toLowerCase() == x.name.toLowerCase()
					|| value.match(new RegExp(x.name.replace(/\*/g, ".*")));
			});
			var translation = null;
			if (translations.length > 1) {
				translations.forEach(function(x) {
					if (translation == null || translation.name.length < x.name.length)	 {
						translation = x;
					}
				});
			}
			else if (translations.length == 1) {
				translation = translations[0];
			}
			return translation && translation.translation 
				? translation.translation 
				: (defaultValue ? defaultValue : "%{An error has occurred while trying to complete your action}");
		},
		translate: function(value, component) {
			if (value && value.indexOf) {
				while (value.indexOf("%" + "{") >= 0) {
					var start = value.indexOf("%" + "{");
					var depth = 1;
					var end = -1;
					for (var j = start + 2; j < value.length; j++) {
						if (value.charAt(j) == "{") {
							depth++;
						}
						else if (value.charAt(j) == "}") {
							depth--;
							if (depth == 0) {
								end = j;
								break;
							}
						}
					}
					// no end tag
					if (end < 0) {
						break;
					}
					var available = value.substring(start + 2, end);
					var parts = available.split("::");
					var translation = this.translations.filter(function(x) {
						return ((parts.length == 1 && x.context == null)
								|| (parts.length == 2 && x.context == parts[0]))
							&& (x.name == (parts.length == 1 ? parts[0] : parts[1]));
					})[0];
					value = value.substring(0, start) + (translation && translation.translation ? translation.translation : (parts.length == 1 ? parts[0] : parts[1])) + value.substring(end + 1);
				}
			}
			return value;
		},
		interpret: function(value, component) {
			if (typeof(value) == "string" && value.length > 0 && value.substring(0, 1) == "=") {
				value = value.substring(1);
				var result = null;
				var stateOwner = component;
				while (!stateOwner.localState && stateOwner.$parent) {
					stateOwner = stateOwner.$parent;
				}
				if (stateOwner && stateOwner.localState) {
					result = this.eval(value, stateOwner.localState, component);
				}
				if (result == null && stateOwner && stateOwner.state) {
					result = this.eval(value, stateOwner.state, component);
				}
				if (result == null && component.page) {
					var pageInstance = this.getPageInstance(component.page, component);
					result = this.getBindingValue(pageInstance, value);
				}
				value = result;
			}
			if (typeof(value) == "string") {
				var changed = true;
				while (changed) {
					changed = false;
					var index = value.indexOf("{{");
					if (index >= 0) {
						var end = value.indexOf("}}", index);
						if (end >= index) {
							var rule = value.substring(index + 2, end);
							var result = null;
							if (component) {
								var stateOwner = component;
								while (!stateOwner.localState && stateOwner.$parent) {
									stateOwner = stateOwner.$parent;
								}
								if (stateOwner && stateOwner.localState) {
									result = this.eval(rule, stateOwner.localState, component);
								}
								if (result == null && stateOwner && stateOwner.state) {
									result = this.eval(rule, stateOwner.state, component);
								}
								if (result == null && component.page) {
									var pageInstance = this.getPageInstance(component.page, component);
									result = this.getBindingValue(pageInstance, rule);
								}
							}
							// when loading variables in the initial things like api keys in imports
							// there is no component yet
							// you can basically only use application level variables then
							else if (rule.trim().indexOf("application.") == 0) {
								var variable = rule.trim().substring("application.".length);
								variable = this.properties.filter(function(x) { return x.key == variable })[0];
								result = variable ? variable.value : null;
							}
							value = value.substring(0, index) + (result == null ? "" : result) + value.substring(end + 2);
							changed = true;
						}
					}
				}
			}
			return value;
		},
		getValue: function(data, field) {
			if (field) {
				if (data && data.hasOwnProperty(field)) {
					return data[field];
				}
				var parts = field.split(".");
				var value = data;
				parts.forEach(function(part) {
					// skip $all, you just want the entire value
					if (value && part != "$all") {
						value = value[part];
					}
				});
				return value;
			}
			return null;
		},
		setValue: function(data, field, value) {
			var tmp = data;
			var parts = field.split(".");
			for (var i = 0; i < parts.length - 1; i++) {
				if (parts[i] == "$all") {
					continue;
				}
				if (!tmp[parts[i]]) {
					// if it does not exist and we are trying to set null, leave it
					if (value == null) {
						return;
					}
					Vue.set(tmp, parts[i], {});
				}
				tmp = tmp[parts[i]];
			}
			Vue.set(tmp, parts[parts.length - 1], value);
		},
		getInputBindings: function(operation) {
			var self = this;
			var bindings = {};
			if (operation && operation.parameters) {
				var self = this;
				operation.parameters.map(function(parameter) {
					if (parameter.in == "body") {
						var type = self.$services.swagger.resolve(parameter);
						if (type.schema.properties) {
							Object.keys(type.schema.properties).map(function(key) {
								// 1-level recursion (currently)
								// always add the element itself if it is a list (need to be able to add/remove it)
								if (type.schema.properties[key].type != "object") {
									var newKey = "body." + key;
									bindings[newKey] = null;
								}
								if (type.schema.properties[key].type == "object" || type.schema.properties[key].type == "array") {
									var properties = type.schema.properties[key].type == "array" ? type.schema.properties[key].items.properties : type.schema.properties[key].properties;
									Object.keys(properties).map(function(key2) {
										var newKey = "body." + key + "." + key2;
										bindings[newKey] = null;	
									});
								}
							});
						}
					}
					else {
						bindings[parameter.name] = null;
					}
				});
			}
			return bindings;
		},
		getOperations: function(accept) {
			var result = [];
			var operations = this.$services.swagger.operations;
			Object.keys(operations).map(function(operationId) {
				if (accept(operations[operationId])) {
					result.push(operations[operationId]);
				}
			});
			result.sort(function(a, b) {
				return a.id.localeCompare(b.id);
			});
			return result;
		},
		getStateOperations: function(value) {
			var self = this;
			return Object.keys(this.$services.swagger.operations).filter(function(operationId) {
				if (value && operationId.toLowerCase().indexOf(value.toLowerCase()) < 0) {
					return false;
				}
				var operation = self.$services.swagger.operations[operationId];
				// must be a get
				return operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
			});
		},
		getSimpleClasses: function(value) {
			var classes = ["primary", "secondary", "info", "success", "warning", "danger", "inline"];
			if (value) {
				classes = classes.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			// the class itself is allowed
			if (classes.indexOf(value) < 0) {
				classes.push(value);
			}
			return classes;
		},
		getDynamicClasses: function(styles, state, instance) {
			if (!styles) {
				return [];
			}
			var self = this;
			return styles.filter(function(style) {
				return self.isCondition(style.condition, state, instance);
			}).map(function(style) {
				return self.$services.page.interpret(style.class, instance);
			});
		},
		getPageParameterValues: function(page, pageInstance) {
			// copy things like query parameters & path parameters
			var result = pageInstance.variables ? nabu.utils.objects.clone(pageInstance.variables) : {};
			// copy internal parameters as well
			if (pageInstance.parameters) {
				//var parameters = this.getPageParameters(page).properties;
/*				Object.keys(parameters).forEach(function(key) {
					if (pageInstance.parameters[key] != null) {
						result[key] = pageInstance.parameters[key];
					}
				});*/
				Object.keys(pageInstance.parameters).forEach(function(key) {
					// runtime values in variables take precedence over static input parameters!
					if (pageInstance.parameters[key] != null && !result.hasOwnProperty(key)) {
						result[key] = pageInstance.parameters[key];
					}
				});
			}
			return result;
		},
		isCondition: function(condition, state, instance) {
			if (!condition) {
				return true;
			}
			var result = this.eval(condition, state, instance);
			return !!result;
		},
		getPageState: function(pageInstance) {
			var state = {};
			// inherit state from above
			if (pageInstance.localState) {
				Object.keys(pageInstance.localState).map(function(key) {
					state[key] = pageInstance.localState[key];
				})
			}
			Object.keys(pageInstance.variables).map(function(key) {
				if (typeof(state[key]) == "undefined") {
					state[key] = pageInstance.variables[key];
				}
			});
			var parameters = pageInstance.parameters ? nabu.utils.objects.clone(pageInstance.parameters) : {};
			Object.keys(parameters).forEach(function(key) {
				var page = {};
				if (parameters[key] != null) {
					page[key] = parameters[key];
				}
				state.page = page;
			});
			return state;
		},
		hasFeature: function(feature) {
			// remove syntax if applicable
			feature = feature.replace("@" + "{", "");
			feature = feature.replace("}", "");
			return this.enabledFeatures.indexOf(feature) >= 0;
		},
		evalInContext: function(context, code) {
			var value;
			try {
				// for expressions
				value = eval('with(context) { ' + js + ' }');
			}
			catch (e) {
				if (e instanceof SyntaxError) {
					try {
						// for statements
						value = (new Function('with(this) { ' + js + ' }')).call(context);
					}
					catch (e) {
						// do nothing
					}
				}
			}
			return value;	
		},
		eval: function(condition, state, instance) {
			if (!condition) {
				return null;
			}
			// replace all the enabled features with true
			this.enabledFeatures.forEach(function(x) {
				// avoid the regex matcher!
				condition = condition.replace("@" + "{" + x + "}", "true");
			});
			// replace all the disabled features with false
			condition = condition.replace(/@\{[^}]+\}/gm, "false");
			
			if (this.useEval) {
				try {
					var result = eval(condition);
				}
				catch (exception) {
					console.warn("Could not evaluate", condition, exception);
					return false;
				}
				if (result instanceof Function) {
					result = result(state);
				}
				return result;
			}
			else {
				try {
					var resultFunction = Function('"use strict";return (function(state, $services, $value, application) { return ' + condition + ' })')();
					// by default it is bound to "undefined"
					resultFunction = resultFunction.bind(this);
					var result = resultFunction(state, this.$services, instance ? instance.$value : function() { throw "No value function" }, application);
				}
				catch (exception) {
					if (${environment("development")}) {
						console.warn("Could not evaluate", condition, exception);
					}
					return null;
				}
				if (result instanceof Function) {
					// by default it is bound to "undefined"
					result = result.bind(this);
					result = result(state);
				}
				return result;
			}
			return null;
		},
		classes: function(clazz, value) {
			var result = [];
			var sheets = document.styleSheets;
			for (var l = 0; l < sheets.length; l++) {
				try {
					var rules = sheets.item(l).rules || sheets.item(l).cssRules;
					for (var i = 0; i < rules.length; i++) {
						var rule = rules.item(i);
						if (rule.selectorText) {
							if (rule.selectorText.match(new RegExp(".*\\." + clazz + "\\.([\\w-]+)\\b.*", "g"))) {
								var match = rule.selectorText.replace(new RegExp(".*\\." + clazz + "\\.([\\w-]+)\\b.*", "g"), "$1");
								if (result.indexOf(match) < 0) {
									result.push(match);
								}
							}
						}
					}
				}
				catch (exception) {
					// ignore
				}
			}
			if (value) {
				result = result.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
				// allow the (partial) value itself
				if (result.indexOf(value) < 0) {
					result.push(value);	
				}
			}
			return result;
		},
		getSimpleKeysFor: function(definition, includeComplex, includeArrays, keys, path) {
			var self = this;
			var sort = false;
			if (!keys) {
				keys = [];
				sort = true;
			}
			if (definition && definition.properties) {
				Object.keys(definition.properties).map(function(key) {
					// arrays can not be chosen, you need to bind them first
					// simple arrays are always allowed currently
					if (definition.properties[key] && (definition.properties[key].type != "array" || includeArrays || (definition.properties[key].items && !definition.properties[key].items.properties))) {
						var childPath = (path ? path + "." : "") + key;
						var isArray = definition.properties[key].type == "array";
						var isComplex = !!definition.properties[key].properties;
						// if we have an array, it can be a complex array
						if (!isComplex && definition.properties[key].items) {
							isComplex = !!definition.properties[key].items.properties;
						}
						if (includeComplex || !isComplex) {
							keys.push(childPath);
						}
						// if it is complex, recurse
						if (isComplex) {
							if (isArray) {
								// not sure if the ternary is needed, "definition.properties[key].items" should be correct for complex types
								// but for backwards compatibility i don't want to mess it up
								self.getSimpleKeysFor(definition.properties[key].items.properties ? definition.properties[key].items : {properties:definition.properties[key].items}, includeComplex, includeArrays, keys, childPath);
							}
							else {
								self.getSimpleKeysFor(definition.properties[key], includeComplex, includeArrays, keys, childPath);
							}
						}
					}
				});
			}
			if (sort) {
				keys.sort();
			}
			return keys;
		},
		saveConfiguration: function() {
			var self = this;
			return this.$services.swagger.execute("nabu.web.page.core.rest.configuration.update", {
				body: {
					title: this.title,
					home: this.home,
					homeUser: this.homeUser,
					users: this.users,
					properties: self.properties,
					environmentProperties: self.environmentProperties,
					devices: self.devices,
					imports: self.imports,
					state: self.applicationState,
					googleSiteVerification: self.googleSiteVerification,
					geoRefusalTimeout: self.geoRefusalTimeout,
					defaultLocale: self.defaultLocale,
					branding: self.branding
				}
			});
		},
		listFunctionDefinitions: function() {
			var result = [];
			nabu.utils.arrays.merge(result, this.functions);
			nabu.utils.arrays.merge(result, nabu.page.providers("page-function"));
			return result;
		},
		listFunctions: function(value) {
			var result = this.listFunctionDefinitions().map(function(x) { return x.id });
			return result.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		getFunctionInput: function(id, value) {
			var transformer = this.$services.page.functions.filter(function(x) { return x.id == id })[0];
			if (!transformer) {
				transformer = nabu.page.providers("page-function").filter(function(x) { return x.id == id })[0];
			}
			var parameters = {};
			var self = this;
			if (transformer && transformer.inputs) {
				transformer.inputs.map(function(x) {
					parameters[x.name] = self.$services.page.getResolvedPageParameterType(x.type);
					if (!parameters[x.name].required && x.required) {
						parameters[x.name].required = x.required;
					}
				});
			}
			return {properties:parameters};
		},
		hasFunctionOutput: function(id) {
			var output = this.getFunctionOutputFull(id);
			return Object.keys(output.properties).length > 0;
		},
		// really poor naming decisions lead to this...
		getFunctionOutputFull: function(id, value) {
			var transformer = this.$services.page.functions.filter(function(x) { return x.id == id })[0];
			if (!transformer) {
				transformer = nabu.page.providers("page-function").filter(function(x) { return x.id == id })[0];
			}
			var parameters = {};
			var self = this;
			if (transformer && transformer.outputs) {
				transformer.outputs.map(function(x) {
					parameters[x.name] = self.$services.page.getResolvedPageParameterType(x.type);
				});
			}
			return {properties:parameters};
		},
		getFunctionOutput: function(id, value) {
			return this.$services.page.getSimpleKeysFor(this.getFunctionOutputFull(id, value), true, true);
		},
		saveCompiledCss: function() {
			this.$services.swagger.execute("nabu.web.page.core.rest.style.compile", {
				applicationId: this.applicationId,
				body: {
					compiled: this.lastCompiled
				}
			});
		},
		saveFunction: function(transformer) {
			try {
				var result = new Function('input', '$services', '$value', 'resolve', 'reject', transformer.content);
				var parts = transformer.id.split(".");
				var target = window;
				for (var i = 0; i < parts.length - 1; i++) {
					if (!target[parts[i]]) {
						target[parts[i]] = {};
					}
					target = target[parts[i]];
				}
				target[parts[parts.length - 1]] = result;
				// if we get this far, also recompile all transformers
				var compiled = "";
				this.functions.forEach(function(transformer) {
					var parts = transformer.id.split(".");
					// make global namespace
					for (var i = 0; i < parts.length - 1; i++) {
						compiled += "if (!" + parts[i] + ") " + (i == 0 ? "var " : "") + parts[i] + " = {};\n";
					}
					compiled += (parts.length == 1 ? "var " : "") + transformer.id + " = function(input, $services, $value, resolve, reject) {\n";
					compiled += "\t" + transformer.content.replace(/\n/g, "\n\t") + "\n";
					compiled += "}\n";
				});
				compiled += "Vue.service('functionRegistrar', {\n";
				compiled += "	services: ['page'],\n";
				compiled += "	activate: function(done) {\n"
				// we only load the functions if we are not editing, otherwise they are available as per usual
				compiled += "		if (!this.$services.page.editable) {\n";
				this.functions.forEach(function(transformer) {
					compiled += "			nabu.page.provide('page-function', {\n";
					compiled += "				id: '" + transformer.id + "',\n";
					compiled += "				async: " + !!transformer.async + ",\n";
					compiled += "				implementation: " + transformer.id + ",\n";
					compiled += "				inputs: " + (transformer.inputs ? JSON.stringify(transformer.inputs) : []) + ",\n";
					compiled += "				outputs: " + (transformer.inputs ? JSON.stringify(transformer.outputs) : []) + "\n";
					compiled += "			});\n";
				});
				compiled += "		}\n";
				compiled += "		done();\n";
				compiled += "	}\n";
				compiled += "})\n";
				this.$services.swagger.execute("nabu.web.page.core.rest.function.compiled", {body:{content: compiled}});
			}
			catch (exception) {
				this.functionError = exception.message;
				console.error("Could not create function", exception.message);
			}
			return this.$services.swagger.execute("nabu.web.page.core.rest.function.write", { name:transformer.id, body: {content: JSON.stringify(transformer, null, 2) } });
		},
		createFunction: function() {
			var self = this;	
			var name = prompt("Function Id");
			if (name && this.functions.map(function(x) { return x.id.toLowerCase() }).indexOf(name.toLowerCase()) < 0) {
				var transformer = { id:name, inputs:[], outputs:[], content: "" };
				this.saveFunction(transformer).then(function() {
					self.functions.push(transformer);
				});
			}
		},
		createStyle: function() {
			var self = this;
			var name = prompt("Stylesheet Name");
			if (name && this.styles.map(function(x) { return x.name.toLowerCase() }).indexOf(name.toLowerCase()) < 0) {
				this.$services.swagger.execute("nabu.web.page.core.rest.style.write", { name:name, body: { content: "" } }).then(function() {
					self.styles.push({
						name: name,
						content: ""
					});
				});
			}
		},
		updateCss: function(style, rebuild) {
			var self = this;
			return this.$services.swagger.execute("nabu.web.page.core.rest.style.update", {
				applicationId: configuration.applicationId,
				body: style
			}).then(function() {
				if (rebuild && false) {
					self.compileCss();
				}	
			});
		},
		compileCss: function() {
			this.cssStep = "refresh";
			var self = this;
			Sass.importer(function(request, done) {
				var commonFiles = "";
				self.styles.filter(function(x) {
					return x.title == "utility" && x.description;
				}).map(function(x) {
					commonFiles += "@import '" + x.name + "';\n";
				});
				// Sass.js already found a file, we probably want to just load that
				if (request.path) {
					done();
				}
				// provide a file
				else if (request.current) {
					var style = self.styles.filter(function(x) {
						return x.name == request.current;
					})[0];
					var content = style ? style.description : null;
					if (style.title != "utility") {
						content = commonFiles + content;
					}
					if (content) {
						self.cssStep = "check-square-o";
						done({
							content: content
						});
					}
					else {
						self.cssStep = "exclamation-triangle";
						done({
							error: "Could not find: " + request.current
						});
					}
				}
				// provide a specific content
				else if (request.current === 'redirect') {
					throw "redirect not supported currently";
					done({
						path: '/sass/to/some/other.scss'
					});
				}
				else if (request.current === 'error') {
					// provide content directly
					// note that there is no cache
					done({
						error: 'import failed because...no one knows'
					});
				}
				else {
					// let libsass handle the import
					done();
				}
			});
			var scss = "";
			this.styles.filter(function(x) { return x.title != "utility" && x.description }).map(function(x) {
				scss += "@import '" + x.name + "';\n";
			});
			Sass.compile(scss, function(result) {
				if (result.status == 0) {
					if (self.customStyle) {
						document.head.removeChild(self.customStyle);
					}
					self.customStyle = document.createElement("style");
					self.customStyle.innerHTML = result.text;
					self.customStyle.innerHTML += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(JSON.stringify(result.map)) + " */";
					document.head.appendChild(self.customStyle);
					self.lastCompiled = result.text;
				}
				else {
					console.error("Compilation failed", result);
				}
			});
		},
		inject: function(link, callback, failure, async) {
			// only inject it once!
			var existing = document.head.querySelector('script[src="' + link + '"]');
			if (existing) {
				if (callback) {
					callback();
				}
			}
			else {
				var script = document.createElement("script");
				script.setAttribute("src", link);
				script.setAttribute("type", "text/javascript");
				if (async) {
					script.setAttribute("async", "true");
				}
				
				if (callback) {
					// IE (not 11)
					if (script.readyState){  
						script.onreadystatechange = function() {
							if (script.readyState == "loaded" || script.readyState == "complete") {
								script.onreadystatechange = null;
								callback();
							}
						};
					}
					// IE 11?
					else if (script.attachEvent) {
						script.attachEvent("onload", function() {
							callback();
						});
						if (failure) {
							script.attachEvent("onerror", function() {
								failure();
							});
						}
					}
					else if (script.addEventListener) {
						script.addEventListener("load", function() {
							callback();
						});
						if (failure) {
							script.addEventListener("error", function() {
								failure();
							});
						}
					}
					// rest
					else { 
						script.onload = function() {
							callback();
						};
					}
				}
				document.head.appendChild(script);
			}
		},
		canEdit: function() {
			return !this.isServerRendering && this.editable;	
		},
		canTest: function() {
			return this.canEdit() || (!this.isServerRendering && this.testable);
		},
		pathParameters: function(url) {
			if (!url) {
				return [];
			}
			var variables = url.match(/\{[\s]*[^}:]+[\s]*(:[\s]*([^}]+)[\s]*|)\}/g);
			return !variables ? [] : variables.map(function(variable) {
				return variable.substring(1, variable.length - 1).replace(/:.*$/, "");
			});
		},
		alias: function(page) {
			return page.name;
		},
		rename: function(page, name) {
			var newName = this.dashify(name);
			// if we actually renamed it...
			if (newName != page.name) {
				newName = this.uniquifyPageName(newName);
				var oldName = page.name;
				page.name = newName;
				page.content.label = name;
				var self = this;
				return this.update(page).then(function() {
					self.removeByName(oldName);
				});
			}
		},
		remove: function(page) {
			var self = this;
			this.removeByName(page.name).then(function() {
				self.pages.splice(self.pages.indexOf(page), 1);
			});
		},
		removeByName: function(name) {
			return this.$services.swagger.execute("nabu.web.page.core.rest.page.delete", {name: name});
		},
		uniquifyPageName: function(pageName) {
			var existing = this.pages.map(function(x) {
				return x.name;
			});
			var tryName = pageName;
			var counter = 1;
			while (existing.indexOf(tryName) >= 0) {
				tryName = pageName + counter;
			}
			return tryName;
		},
		create: function(name, category) {
			var newName = this.uniquifyPageName(this.dashify(name));
			
			var content = this.normalize({
				label: name
			});
			if (category) {
				content.category = category;
			}
			// we automatically add page path, it is usually in sync
			// especially now that we add a default skeleton, this makes it easier
			content.path = "/" + this.dashify(name);
			return this.update({
				name: newName,
				content: content
			});
		},
		update: function(page) {
			var self = this;
			if (!page.content) {
				page.content = self.normalize({});
			}
			page.content.name = page.name;
			page.marshalled = JSON.stringify(page.content, null, "\t");
			return this.$services.swagger.execute("nabu.web.page.core.rest.page.update", { body: page }).then(function() {
				// add it to the pages if it isn't there yet (e.g. create)
				var index = self.pages.indexOf(page);
				// re-add to trigger a reregister (if necessary)
				if (index >= 0) {
					self.pages.splice(index, 1, page);
				}
				else {
					self.pages.push(page);
				}
			});
		},
		findMain: function(rowHolder) {
			if (rowHolder.rows && rowHolder.rows.length) {
				for (var i = 0; i < rowHolder.rows.length; i++) {
					if (rowHolder.rows[i].customId == "main") {
						return rowHolder.rows[i];
					}
					if (rowHolder.rows[i].cells && rowHolder.rows[i].cells.length) {
						for (var j = 0; j < rowHolder.rows[i].cells.length; j++) {
							var cell = rowHolder.rows[i].cells[j];
							if (cell.customId == "main") {
								return cell;
							}
							else if (cell.rows) {
								var main = this.findMain(cell);
								if (main) {
									return main;
								}
							}
						}
					}
				}
			}
			return null;
		},
		filterRoutes: function(value) {
			if (value != null && value.substring(0, 1) == "=") {
				return [value];
			}
			var routes = this.$services.router.list().filter(function(x) {
				return x.alias && (!value || x.alias.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
			routes.sort(function(a, b) {
				return a.alias.localeCompare(b.alias);
			});
			return routes.map(function(x) { return x.alias });
		},
		loadPages: function(pages) {
			var self = this;
			pages.map(function(page) {
				if (!page.content) {
					Vue.set(page, "content", self.normalize(page.marshalled ? JSON.parse(page.marshalled) : {}));
				}
				
				var parameters = {};
				if (page.content.parameters) {
					page.content.parameters.map(function(x) {
						parameters[x.name] = self.getResolvedPageParameterType(x.type);
						// currently we do not want to allow you to map different parts
						if (parameters[x.name].properties) {
							parameters[x.name].properties = {};
						}
					})
				}
				
				var pagePath = page.content.path;
				if (pagePath && pagePath.indexOf("/") != 0) {
					pagePath = "/" + pagePath;
				}
				var route = {
					alias: self.alias(page),
					url: page.content.initial ? "/.*" : pagePath,
					query: page.content.query ? page.content.query : [],
					//parameters: page.content.parameters ? page.content.parameters.map(function(x) { return x.name }) : [],
					parameters: parameters,
					enter: function(parameters, mask) {
						if (page.content.initial) {
							var found = !!self.findMain(page.content);
							// check that there is a row/cell with the default anchor, if not, insert it
/*							for (var i = 0; i < page.content.rows.length; i++) {
								if (page.content.rows[i].customId == "main") {
									found = true;
									break;
								}
							}*/
							// we push a row so we can route _something_
							// otherwise everything might break!
							if (!found) {
								page.content.rows.push({
									id: 0,
									customId: "main",
									cells: [],
									class: null
								});
							}
						}
						else if (page.content.path) {
							// break out
							setTimeout(function() {
								self.$services.analysis.push({
									source: "router",
									category: "action",
									type: "browse",
									group: page.content.category,
									event: page.content.name,
									path: page.content.path
								});
							}, 1);
						}
						// we update the og:url meta tag to make sure we can share this page
						var url = "${when(environment('url') != null, environment('url'), '')}";
						// We only put absolute uris in the og:url meta tag
						if (url && page.content.path) {
							// the router returns a path with the server.root() in it
							var absoluteUrl = url + self.$services.router.router.templateUrl(page.content.path, parameters, page.content.query);
							self.updateUrl(absoluteUrl);
						}
						return new nabu.page.views.Page({propsData: {page: page, parameters: parameters, stopRerender: parameters ? parameters.stopRerender : false, pageInstanceId: self.pageCounter++, masked: mask }});
					},
					// ability to recognize page routes
					isPage: true,
					initial: page.content.initial,
					roles: page.content.roles != null && page.content.roles.length > 0 ? page.content.roles : null,
					slow: !page.content.initial && page.content.slow,
					parent: page.content.pageParent,
					defaultAnchor: page.content.defaultAnchor,
					// additional properties set on the page
					properties: page.content.properties ? page.content.properties : []
				};
				
				self.$services.router.unregister(self.alias(page));
				self.$services.router.register(route);
			});
		},
		normalize: function(content) {
			// the rows with content
			if (!content.rows) {
				content.rows = [];
			}
			if (!content.path) {
				content.path = null;
			}
			// a counter that serves as id generator
			if (!content.counter) {
				content.counter = 1;
			}
			// contains the definition of the variables (usually just a name)
			// does _not_ contain the value, this is a runtime thing
			if (!content.variables) {
				content.variables = [];
			}
			// definition of the query parameters
			if (!content.query) {
				content.query = [];
			}
			// actions linked to an event
			if (!content.actions) {
				content.actions = [];
			}
			// css class
			if (!content.class) {
				content.class = null;
			}
			if (!content.initial) {
				content.initial = false;
			}
			if (!content.menuX) {
				content.menuX = 0;
			}
			if (!content.menuY) {
				content.menuY = 0;
			}
			if (!content.states) {
				content.states = [];
			}
			if (!content.category) {
				content.category = null;
			}
			if (!content.slow) {
				content.slow = false;
			}
			return content;
		},
		getRouteParameters: function(route) {
			var result = {
				properties: {}
			};
			if (!route) {
				return result;
			}
			if (route.parent) {
				var parentRoute = this.$services.router.get(route.parent);
				if (parentRoute) {
					var parentResult = this.getRouteParameters(parentRoute);
					if (parentResult && parentResult.properties) {
						nabu.utils.objects.merge(result.properties, parentResult.properties);
					}
				}
			}
			if (route.url) {
				this.pathParameters(route.url).map(function(key) {
					result.properties[key] = {
						type: "string"
					}
				});
			}
			if (route.query) {
				route.query.map(function(key) {
					// the key could already be a complex definition (though unlikely)
					result.properties[key] = typeof(key) == "string" ? {type: "string"} : key;
				});
			}
			// we assume a parameters object that has the json-esque definitions
			if (route.parameters) {
				nabu.utils.objects.merge(result.properties, route.parameters);
			}
			return result;
		},
		getArrays: function(definition, path, arrays) {
			if (!arrays) {
				arrays = [];
			}
			if (definition && definition.properties) {
				var keys = Object.keys(definition.properties);
				for (var i = 0; i < keys.length; i++) {
					var property = definition.properties[keys[i]];
					var childPath = (path ? path + "." : "") + keys[i];
					if (property.type == "array") {
						arrays.push(childPath);
					}
					else if (property.properties) {
						this.getArrays(property, childPath, arrays);
					}
				}
			}
			// the definition itself could be an array, the path is likely null at that point though...
			else if (definition && definition.type == "array") {
				arrays.push(path);
			}
			return arrays;
		},
		// this simply returns all available parameters, regardless of whether you listen on it or not
		// currently not cell specific, so does not take into account repeats
		getAllAvailableParameters: function(page, context) {
			var result = {};
			
			var self = this;
			if (!context) {
				context = self;
			}
			var pageInstance = self.$services.page.getPageInstance(page, context);
			
			var provided = this.getProvidedParameters();
			Object.keys(provided.properties).map(function(key) {
				result[key] = provided.properties[key];	
			});
			
			var application = this.getApplicationParameters();
			if (Object.keys(application.properties).length) {
				result.application = application;
			}

			// if you inherit from another page, we add that as well
			if (page.content.pageParent) {
				var parentPage = this.pages.filter(function(x) {
					return x.content.name == page.content.pageParent;
				})[0];
				if (parentPage != null) {
					result.parent = this.getPageParameters(parentPage);
				}
			}
			// and the page itself
			result.page = this.getPageParameters(page);
			
			// the available state
			page.content.states.map(function(state) {
				var operation = null;
				if (state.inherited) {
					operation = self.applicationState.filter(function(x) { return x.name == state.applicationName }).map(function(x) { return x.operation })[0];
				}
				else {
					operation = state.operation;
				}
				if (operation && self.$services.swagger.operation(operation).responses && self.$services.swagger.operation(operation).responses["200"]) {
					result[state.name] = self.$services.swagger.resolve(self.$services.swagger.operation(operation).responses["200"]).schema;
				}
			});
			
			// the available computed
			if (page.content.computed) {
				page.content.computed.map(function(state) {
					if (state.name && state.bindings && state.bindings[state.name] && state.bindings[state.name].label == "$function") {
						var output = self.getFunctionOutputFull(state.bindings[state.name].value);
						if (state.bindings && state.bindings[state.name].output) {
							output = output.properties[state.bindings[state.name].output];
						}
						result[state.name] = output;
					}
				});
			}
			
			// and map all events
			var available = pageInstance.getEvents();
			Object.keys(available).map(function(key) {
				result[key] = available[key];
			});
			
			nabu.page.providers("page-enumerate").forEach(function(x) {
				if (x.enumerate && x.label) {
					var tmp = {};
					var entries = x.enumerate();
					if (entries) {
						entries.forEach(function(y) {
							tmp[y[x.label]] = {
								type: "string"
							};
						});
						result[x.name] = {properties:tmp};
					}
				}
			})
			
			return result;
		},
		getAllAvailableKeys: function(page, includeComplex, value) {
			var keys = [];
			var self = this;
			var parameters = this.getAllAvailableParameters(page);
			Object.keys(parameters).map(function(key) {
				// not the page itself? this is mostly for eventing purposes, for other purposes it might be interesting to keep it
				if (includeComplex && key != "page") {
					keys.push(key);
				}
				nabu.utils.arrays.merge(keys, self.getSimpleKeysFor(parameters[key], includeComplex).filter(function(x) { return x != null}).map(function(x) {
					return key + "." + x;
				}));
			});
			if (value) {
				keys = keys.filter(function(x) {
					return x && x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return keys;
		},
		getAvailableKeys: function(page, cell, includeAllEvents) {
			var keys = [];
			var self = this;
			var parameters = this.getAvailableParameters(page, cell, includeAllEvents);
			Object.keys(parameters).map(function(key) {
				nabu.utils.arrays.merge(keys, self.getSimpleKeysFor(parameters[key]).map(function(x) {
					return key + "." + x;
				}));
			});
			return keys;
		},
		getAvailableParameters: function(page, cell, includeAllEvents) {
			var result = {};

			var self = this;
			var pageInstance = self.$services.page.getPageInstance(page, self);
			
			// the available events
			var available = pageInstance.getEvents();
			if (includeAllEvents) {
				Object.keys(available).map(function(key) {
					result[key] = available[key];
				});
			}
			
			var provided = this.getProvidedParameters();
			Object.keys(provided.properties).map(function(key) {
				result[key] = provided.properties[key];	
			});
			
			var application = this.getApplicationParameters();
			if (Object.keys(application.properties).length) {
				result.application = application;
			}
			
			// if you inherit from another page, we add that as well
			if (page.content.pageParent) {
				var parentPage = this.pages.filter(function(x) {
					return x.content.name == page.content.pageParent;
				})[0];
				if (parentPage != null) {
					result.parent = this.getPageParameters(parentPage);
				}
			}
			// and the page itself
			result.page = this.getPageParameters(page);

			// the available state, page state overrides page parameters & application parameters if relevant
			page.content.states.map(function(state) {
				var operation = null;
				if (state.inherited) {
					operation = self.applicationState.filter(function(x) { return x.name == state.applicationName }).map(function(x) { return x.operation })[0];
				}
				else {
					operation = state.operation;
				}
				if (operation) {
					operation = self.$services.swagger.operation(operation);
					if (operation && operation.responses && operation.responses["200"]) {
						result[state.name] = self.$services.swagger.resolve(operation.responses["200"]).schema;
					}
				}
			});
			
			// the available computed
			if (page.content.computed) {
				page.content.computed.map(function(state) {
					if (state.name && state.bindings && state.bindings[state.name] && state.bindings[state.name].label == "$function") {
						var output = self.getFunctionOutputFull(state.bindings[state.name].value);
						if (state.bindings && state.bindings[state.name].output) {
							output = output.properties[state.bindings[state.name].output];
						}
						result[state.name] = output;
					}
				});
			}
			
			// cell specific stuff overwrites everything else
			if (cell) {
				var targetPath = this.getTargetPath(page.content, cell.id);
				if (targetPath && targetPath.length) {
					targetPath.map(function(part) {
						if (part.on) {
							result[part.on] = available[part.on];
						}
						if (part.instances) {
							Object.keys(part.instances).map(function(key) {
								var array = part.instances[key];
								if (array) {
									var variable = array.substring(0, array.indexOf("."));
									var rest = array.substring(array.indexOf(".") + 1);
									if (result[variable]) {
										result[key] = self.getChildDefinition(result[variable], rest).items;
									}
								}
							})
						}
						if (part.cellState) {
							Object.keys(part.cellState).map(function(key) {
								result[key] = part.cellState[key];
							});
						}
					});
				}
			}

			return result;	
		},
		getTarget: function(rowContainer, id, parent) {
			if (rowContainer.rows) {
				for (var i = 0; i < rowContainer.rows.length; i++) {
					if (rowContainer.rows[i].id == id) {
						return parent ? rowContainer : rowContainer.rows[i];
					}
					if (rowContainer.rows[i].cells) {
						for (var j = 0; j < rowContainer.rows[i].cells.length; j++) {
							if (rowContainer.rows[i].cells[j].id == id) {
								return parent ? rowContainer.rows[i] : rowContainer.rows[i].cells[j];
							}
							var has = this.getTarget(rowContainer.rows[i].cells[j], id, parent);
							if (has) {
								return has;
							}
						}
					}
				}
			}
			return null;
		},
		getAllArrays: function(page, targetId) {
			var self = this;
			var arrays = [];
			// get all the arrays available in the page itself
			// TODO: filter events that you are not registered on?
			var parameters = this.getAvailableParameters(page, null, true);
			Object.keys(parameters).map(function(key) {
				nabu.utils.arrays.merge(arrays, self.getArrays(parameters[key]).map(function(x) { return x == null ? key : key + "." + x }));
			});
			// get all arrays available in parent rows/cells
			var path = this.getTargetPath(page.content, targetId);
			if (path.length) {
				path.map(function(entry) {
					if (entry.instances) {
						Object.keys(entry.instances).map(function(key) {
							var mapping = entry.instances[key];
							if (mapping) {
								var index = mapping.indexOf(".");
								var variable = mapping.substring(0, index);
								var path = mapping.substring(index + 1);
								var definition = self.getChildDefinition(parameters[variable], path);
								nabu.utils.arrays.merge(arrays, self.getArrays(definition.items).map(function(x) { return key + "." + x }));
							}
						});
					}
				});
			}
			return arrays;
		},
		getChildDefinition: function(definition, path, parts, index) {
			if (!parts) {
				parts = path.split(".");
				index = 0;
			}
			var properties = definition == null ? null : (definition.type == "array" ? definition.items.properties : definition.properties);
			if (properties) {
				var child = properties[parts[index]];
				if (index == parts.length - 1) {
					return child;
				}
				else {
					return this.getChildDefinition(child, path, parts, index + 1);
				}
			}
			return null;
		},
		explode: function(into, from, path) {
			var self = this;
			Object.keys(from).forEach(function(key) {
				if (key != null) {
					var value = from[key];
					if (value != null) {
						var childPath = path ? path + "." + key : key;
						if (self.isObject(value)) {
							if (!value._isVue) {
								self.explode(into, value, childPath);
							}
						}
						// only set root values if we have a path?
						else if (path != null) {
							Vue.set(into, childPath, from[key]);
						}
					}
				}	
			});
		},
		isObject: function(object) {
			return Object(object) === object 
				&& !(object instanceof Date)
				&& !(object instanceof File);
		},
		isPublicPageParameter: function(page, name) {
			if (page && page.content && page.content.path) {
				if (this.pathParameters(page.content.path).indexOf(name) >= 0) {
					return true;
				}
			}
			if (page && page.content && page.content.query) {
				if (page.content.query.indexOf(name) >= 0) {
					return true;
				}
			}
			return false;
		},
		getPageParameters: function(page) {
			var parameters = {
				properties: {}
			};
			if (page.content.path) {
				this.pathParameters(page.content.path).map(function(x) {
					parameters.properties[x] = {
						type: "string"
					}
				})
			}
			if (page.content.query) {
				page.content.query.map(function(x) {
					parameters.properties[x] = {
						type: "string"
					}
				});
			}
			
			var self = this;
			if (page.content.states) {
				page.content.states.forEach(function(x) {
					var operation = null;
					if (x.inherited) {
						operation = self.applicationState.filter(function(y) { return y.name == x.applicationName }).map(function(y) { return y.operation })[0];
					}
					else {
						operation = x.operation;
					}
					if (x.name && operation) {
						operation = self.$services.swagger.operation(operation);
						if (operation && operation.responses && operation.responses["200"]) {
							var schema = operation.responses["200"].schema;
							if (schema.$ref) {
								var definition = self.getResolvedPageParameterType(schema.$ref);
								if (definition) {
									parameters.properties[x.name] = definition;
								}
							}
						}
					}
				});
			}
			
			// you can set parameters much like swagger input parameters
			// that means you can set a name
			// you can also set a default value and other stuff
			if (page.content.parameters) {
				var self = this;
				page.content.parameters.map(function(x) {
					/*if (x.type == null || ['string', 'boolean', 'number', 'integer'].indexOf(x.type) >= 0) {
						parameters.properties[x.name] = {
							type: x.type == null ? "string" : x.type
						}
					}
					else {
						parameters.properties[x.name] = self.$services.swagger.resolve(self.$services.swagger.definition(x.type))
					}*/
					parameters.properties[x.name] = self.getResolvedPageParameterType(x.type);
				});
			}
			return parameters;
		},
		// not used atm
		getTranslatableParameters: function(part, translations) {
			if (translations == null) {
				translations = [];
			}
			var self = this;
			if (part.$translations) {
				part.$translations.forEach(function(translation) {
					if (part[translation]) {
						translations.push({
							key: translation,
							value: part[translation]
						});
					}
				});
			}
			Object.keys(part).forEach(function(key) {
				if (key != "$translations" && (!part.$translations || part.$translations.indexOf(key) < 0)) {
					if (typeof(part[key]) == "object") {
						self.getTranslatableParameters(part[key], translations);
					}
					else if (part[key] instanceof Array) {
						part[key].forEach(function(single) {
							if (typeof(single) == "object") {		
								self.getTranslatableParameters(single, translations);
							}
						})
					}
				}
			})
			return translations;
		},
		notify: function(severity, message) {
			this.validations.push({
				severity: severity,
				message: message,
				title: message
			});
		},
		guessNameFromOperation: function(operation) {
			var parts = operation.split(".");
			var reserved = ["create", "read", "update", "delete", "list", "get", "rest", "crud", "services"];
			for (var i = parts.length - 1; i >= 0; i--) {
				if (reserved.indexOf(parts[i]) < 0) {
					return parts[i];
				}
			}
			return null;
		},
		getResolvedPageParameterType: function(type) {
			if (type == null || ['string', 'boolean', 'number', 'integer'].indexOf(type) >= 0) {
				return {type:type == null ? "string" : type};
			}
			else {
				try {
					return this.$services.swagger.resolve(this.$services.swagger.definition(type));
				}
				catch (exception) {
					this.notify("error", "Could not resolve type: " + type);
					return {type: "string"};
				}
			}
		},
		getApplicationParameters: function() {
			var parameters = {
				properties: {}
			};
			// and you can set parameters at the web application level that are accessible to any page
			this.properties.map(function(property) {
				parameters.properties[property.key] = property;
			});
			this.environmentProperties.map(function(property) {
				parameters.properties[property.key] = property;
			});
			return parameters;
		},
		getProvidedParameters: function() {
			var parameters = {
				properties: {}
			};
			nabu.page.providers("page-bindings").map(function(provider) {
				var result = provider();
				if (result && result.definition) {
					Object.keys(result.definition).map(function(key) {
						parameters.properties[key] = result.definition[key];	
					});
				}
			});
			return parameters;
		},
		// retrieves the path of rows/cells to get to the targetId, this can be used to resolve instances for example
		getTargetPath: function(rowContainer, targetId, recursive) {
			// when we explode for example cells in a loop, the id is further finetuned, for example the original cell might have id "2", the exploded will have "2-1", "2-2" etc to guarantee in-document uniqueness
			if (typeof(targetId) == "string" && targetId.indexOf("-") > 0) {
				targetId = targetId.substring(0, targetId.indexOf("-"));
			}
			var reverse = false;
			if (!recursive) {
				recursive = true;
				// we manage the complete path at this level, reverse when everything is done as the path contains everything in the reverse order
				reverse = true;
			}
			var self = this;
			var path = null;
			if (rowContainer.rows) {
				for (var i = 0; i < rowContainer.rows.length; i++) {
					path = [];
					var row = rowContainer.rows[i];
					if (row.id == targetId) {
						path.push(row);
					}
					else {
						for (var j = 0; j < row.cells.length; j++) {
							var cell = row.cells[j];
							if (cell.id == targetId) {
								path.push(cell);
								path.push(row);
							}
							else if (cell.rows) {
								var subPath = self.getTargetPath(cell, targetId, recursive);
								if (subPath && subPath.length) {
									nabu.utils.arrays.merge(path, subPath);
									path.push(cell);
									path.push(row);
								}
							}
							if (path.length) {
								break;
							}
						}
					}
					if (path.length) {
						break;
					}
				}
			}
			if (path && reverse) {
				path.reverse();
			}
			return path;
		},
		getSwaggerParametersAsKeys: function(operation) {
			var self = this;
			var keys = [];
			if (operation) {
				operation.parameters.map(function(parameter) {
					if (parameter.in == "body") {
						var type = self.$services.swagger.resolve(parameter);
						if (type.schema.properties) {
							nabu.utils.arrays.merge(keys, self.getSimpleKeysFor(type.schema).map(function(x) { return "body." + x }));
						}
					}
					else {
						keys.push(parameter.name);
					}
				});
			}
			return keys;
		},
		registerHome: function(home, homeUser) {
			// the previous dynamic home route
			var previousDynamicHome = this.$services.router.router.list().filter(function(x) { return x.alias == "home" && !x.isPage })[0];
			if (previousDynamicHome) {
				this.$services.router.unregister(previousDynamicHome);
			}
			var self = this;
			// check if there is a page-based home, we need to still support that
			var originalHomeRoute = this.$services.router.router.list().filter(function(x) { return x.alias == "home" && x.isPage })[0];
			this.$services.router.register({
				alias: "home",
				enter: function(parameters) {
					// the timeout disconnects the reroute from the current flow
					// otherwise weird things happen
					setTimeout(function() {
						var applicableUser = self.users.filter(function(x) {
							var hasAnyRole = false;
							if (x.roles) {
								x.roles.forEach(function(role) {
									if (role == "$guest" && !self.$services.user.loggedIn) {
										hasAnyRole = true;
									}	
									else if (role == "$user" && self.$services.user.loggedIn) {
										hasAnyRole = true;
									}
									else if (self.$services.user.hasRole && self.$services.user.hasRole(role)) {
										hasAnyRole = true;
									}
								});
							}
							return hasAnyRole;
						})[0];
						if (applicableUser && applicableUser.home) {
							if (applicableUser.home == "home" && originalHomeRoute) {
								originalHomeRoute.enter(parameters);
							}
							else {
								self.$services.router.route(applicableUser.home, parameters);
							}
						}
						else if (homeUser && self.$services.user.loggedIn) {
							if (homeUser == "home" && originalHomeRoute) {
								originalHomeRoute.enter(parameters);
							}
							else {
								self.$services.router.route(homeUser, parameters);
							}
						}
						else if (home) {
							if (home == "home" && originalHomeRoute) {
								originalHomeRoute.enter(parameters);
							}
							else {
								self.$services.router.route(home, parameters);
							}
						}
						else {
							self.$services.router.route("login", parameters, null, true);
						}
					}, 1)
				},
				url: "/",
				priority: 1
			});
		},
		// unused?
		dropOperationInto: function (operation, cell, failIfMissing) {
			var self = this;
			if (this.$services.swagger.operations[operation]) {
				console.log("Dropping", operation);
			}
			else if (!failIfMissing) {
				this.reloadSwagger().then(function() {
					self.dropOperationInto(operation, cell, true);
				});
			}
		},
		updateUrl: function(url) {
			var element = document.head.querySelector("meta[property='og:url']");
			var insert = true;
			if (element) {
				if (element.getAttribute("content") != url) {
					element.parentNode.removeChild(element);
				}
				else {
					insert = false;
				}
			}
			if (insert && url) {
				element = document.createElement("meta");
				element.setAttribute("property", "og:url");
				element.setAttribute("content", url);
				document.head.appendChild(element);
			}
		},
		// update the branding parameters depending on the page
		updateBranding: function(branding) {
			var self = this;
			var fields = ["favicon", "title", "description", "image", "imageAlt", "facebookAppId", "twitterUserName"];
			// the current branding takes the specific branding and (if absent) the default branding
			fields.forEach(function(field) {
				self.currentBranding[field] = branding[field] ? branding[field] : self.branding[field];
				// an exception for title...
				if (!self.currentBranding[field] && field == "title" && self.title) {
					self.currentBranding[field] = self.title;
				}
			})
			var og = ["title", "description", "image"];
			
			fields.forEach(function(field) {
				if (field == "favicon") {
					// updating favicon
					var element = document.head.querySelector("link[rel='icon']");
					var insertFavicon = true;
					if (element) {
						if (element.getAttribute("href") != self.currentBranding[field]) {
							element.parentNode.removeChild(element);
						}
						else {
							insertFavicon = false;
						}
					}
					if (insertFavicon && self.currentBranding[field]) {
						element = document.createElement("link");
						element.setAttribute("rel", "icon");
						element.setAttribute("type", "image/png");
						element.setAttribute("href", self.currentBranding[field]);
						document.head.appendChild(element);
					}
				}
				else if (og.indexOf(field) >= 0) {
					var element = document.head.querySelector("meta[property='og:" + field + "']");
					var insert = true;
					if (element) {
						if (element.getAttribute("content") != self.currentBranding[field]) {
							element.parentNode.removeChild(element);
						}
						else {
							insert = false;
						}
					}
					if (insert && self.currentBranding[field]) {
						element = document.createElement("meta");
						element.setAttribute("property", "og:" + field);
						element.setAttribute("content", self.currentBranding[field]);
						document.head.appendChild(element);
					}
				}
				else if (field == "imageAlt") {
					var element = document.head.querySelector("meta[name='twitter:image:alt']");
					var insert = true;
					if (element) {
						if (element.getAttribute("content") != self.currentBranding[field]) {
							element.parentNode.removeChild(element);
						}
						else {
							insert = false;
						}
					}
					if (insert && self.currentBranding[field]) {
						element = document.createElement("meta");
						element.setAttribute("name", "twitter:image:alt");
						element.setAttribute("content", self.currentBranding[field]);
						document.head.appendChild(element);
					}
				}
				// TODO: the others are not reactive yet, they are generally not updated per page...
			});
		},
		dashify: function(content) {
			return this.underscorify(content).replace(/_/g, "-");
		},
		underscorify: function(content) {
			return content.replace(/[^\w]+/g, "_").replace(/([A-Z]+)/g, "_$1").replace(/^_/, "").replace(/_$/, "")
				.replace(/[_]+/g, "_").toLowerCase();
		},
		prettify: function(text) {
			text = this.underscorify(text);
			var result = null;
			text.split(/_/).forEach(function(x) {
				if (!result) {
					result = "";
				}
				else {
					result += " ";
				}
				if (x.length > 0) {
					result += x.substring(0, 1).toUpperCase() + x.substring(1);
				}
			});
			return result;
		},
		camelify: function(content) {
			// first we do underscores, it is easiest
			// if we start or end with an underscore, remove it
			content = this.underscorify(content);
			var parts = content.split("_")
			var result = null;
			for (var i = 0; i < parts.length; i++) {
				if (result == null) {
					result = parts[i];
				}
				else {
					result += parts[i].substring(0, 1).toUpperCase() + parts[i].substring(1);
				}
			}
			return result;
		},
		normalizeCell: function(cell) {
			if (cell.rows == null) {
				cell.rows = [];
			}
			if (cell.bindings == null) {
				cell.bindings = {};
			}
			if (cell.instances == null) {
				cell.instances = {};
			}
			if (cell.devices == null) {
				cell.devices = [];
			}
			if (cell.state == null) {
				cell.state = {};
			}
			if (cell.id == null) {
				cell.id = -1;
			}
			cell.rows.forEach(this.normalizeRow);
			return cell;
		},
		normalizeRow: function(row) {
			if (row.cells == null) {
				row.cells = [];
			}
			if (row.instances == null) {
				row.instances = {};
			}
			if (row.id == null) {
				row.id = -1;
			}
			row.cells.forEach(this.normalizeCell);
			return row;
		}
	},
	watch: {
		// push the location to the swagger client
		location: function(newValue) {
			this.$services.swagger.geoPosition = newValue;
		},
		pages: function(newValue) {
			if (!this.loading) {
				this.loadPages(newValue);
			}
		},
		title: function(newValue) {
			document.title = newValue;
		},
		home: function(newValue) {
			if (newValue && !this.loading) {
				this.registerHome(newValue, this.homeUser);
			}
		},
		homeUser: function(newValue) {
			if (newValue && !this.loading) {
				this.registerHome(this.home, newValue);
			}
		},
		showConsole: function(newValue) {
			if (this.canTest()) {
				// remove from DOM
				var element = document.querySelector("#nabu-console-instance");
				if (element) {
					element.parentNode.removeChild(element);
				}
				// render a console in the DOM
				if (newValue) {
					var div = document.createElement("div");
					div.setAttribute("id", "nabu-console-instance");
					document.body.appendChild(div);
					this.$services.router.route("nabu-console", { initialTab: this.consoleTab }, div);
					document.body.classList.add("has-nabu-console");
					this.consoleTab = null;
				}
				else {
					document.body.classList.remove("has-nabu-console");
					this.limitReports();
				}
			}
		},
		branding: {
			deep: true,
			handler: function(newValue) {
				var self = this;
				Vue.nextTick(function() {
					self.updateBranding(self.branding);
				})
			}
		}
	}
}), { name: "nabu.page.services.Page" });


document.addEventListener("mousemove", function(event) {
	if (application && application.services && application.services.page) {
		application.services.page.mouseX = event.pageX;
		application.services.page.mouseY = event.pageY;
		application.services.page.mouseXPassive = event.pageX;
		application.services.page.mouseYPassive = event.pageY;
	}
});


