// https://jsfiddle.net/Linusborg/mfqjk5hm/
// https://github.com/vuejs/vue/issues/7431
// try to avoid wrapper elements when inserting html
// not entirely sure if this is still responsive?
Vue.component('html-fragment', {
	functional: true,
	props: {
		html: {
			type: String, 
			required: true
		}
	},
	render: function(h, ctx) {
		return new Vue({
			beforeCreate: function() { this.$createElement = h }, // not necessary, but cleaner imho
			template: "<div>" + ctx.props.html + "</div>"
		}).$mount()._vnode.children;
	}
});

window.addEventListener("load", function() {
	application.bootstrap(function($services) {
		
		$services.router.register({
			alias: "pages",
			enter: function(parameters) {
				return new nabu.page.views.Pages({propsData:parameters});
			},
			url: "/pages"
		});
		
		$services.router.register({
			alias: "home",
			enter: function(parameters) {
				// if you have not overridden this alias (home) but you have added a route at "/", let's look for that
				// it takes presedence over the pages here
				var hasHomeRoute = $services.router.router.findRoute("${server.root()}");
				// it must not have the alias home, to prevent circular refreshes etc
				if (hasHomeRoute && hasHomeRoute.route && hasHomeRoute.route.alias != "home") {
					setTimeout(function() {
						console.log("routing to", hasHomeRoute);
						$services.router.route(hasHomeRoute.route.alias);
					}, 1);
				}
				else {
					return new nabu.page.views.Pages({propsData:parameters});
				}
			},
			priority: -5,
			url: "/"
		});
		
		$services.router.register({
			alias: "offline",
			enter: function(parameters) {
				var component = Vue.component("pages-offline");
				return new component({propsData:parameters});
			},
			priority: -5
		});
		
		$services.router.register({
			alias: "page-static-image",
			query: ["href"],
			enter: function(parameters) {
				return new nabu.page.views.Image({propsData: parameters});
			},
			category: "Content",
			name: "Static Image",
			description: "Position a static image with this component",
			icon: "page/core/images/image.svg"
		});
		
		$services.router.register({
			alias: "page-richtext",
			enter: function(parameters) {
				var component = Vue.component("page-richtext");
				return new component({propsData: parameters});
			},
			icon: "page/core/images/richtext.svg",
			description: "The rich text component can be used to write static texts with markup",
			name: "Rich Text",
			category: "Content"
		});
		
		$services.router.register({
			alias: "page-markdown",
			enter: function(parameters) {
				return new nabu.page.views.Markdown({propsData: parameters});
			}
		});
		
		$services.router.register({
			alias: "page-code",
			enter: function(parameters) {
				return new nabu.page.views.Code({propsData: parameters});
			}
		});
		
		$services.router.register({
			alias: "page-fields",
			enter: function(parameters) {
				return new nabu.page.views.PageFields({propsData: parameters});
			},
			category: "Content",
			name: "Fields",
			description: "Display a number of fields.",
			icon: "page/core/images/page-fields.svg"
		});
		$services.router.register({
			alias: "page-fields-table",
			enter: function(parameters) {
				return new nabu.page.views.PageFieldsTable({propsData: parameters});
			}
		});
	
		$services.router.register({
			alias: "page-actions",
			enter: function(parameters) {
				return new nabu.page.views.PageActions({propsData: parameters});
			},
			icon: "page/core/images/buttons.svg",
			description: "The buttons component can be used to create anything from tabs to actual buttons",
			name: "Buttons",
			category: "Interactive",
			query: ["active"]
		});
		
		$services.router.register({
			alias: "page-form",
			enter: function(parameters) {
				var component = Vue.component("page-form");
				return new component({propsData: parameters});
			},
			name: "Form",
			category: "Form",
			description: "This is a form container that encapsulates simple forms",
			icon: "page/core/images/form.svg",
			accept: function(type, value) {
				if (type == "operation") {
					var operation = $services.swagger.operations[value];
					return (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "post" || operation.method.toLowerCase() == "patch");         
				}
			},
			initialize: function(type, value, component, cell, row, pageInstance) {
				cell.state.operation = value;
				
				// we need to this auto-update the bindings, not ideal...but for now
				var operation = $services.swagger.operations[value];
				component.updateOperation(operation);
				
				component.generateForm();
				
				var name = $services.page.guessNameFromOperation(value);
				
				// remove the last bit, for example if we have demo.rest.company.create, we want to find an operation
				// that starts with demo.rest.company, for example "demo.rest.company.list"
				var shared = value.replace(/\.[^.]+$/, "");
				var getDataComponent = function(rows) {
					for (var i = 0; i < rows.length; i++) {
						if (rows[i].cells) {
							for (var j = 0; j < rows[i].cells.length; j++) {
								var cell = rows[i].cells[j];
								// do a minimalistic check
								if (cell.alias && cell.alias.indexOf("data-") == 0 && cell.state.operation) {
									if (cell.state.operation.indexOf(shared) == 0) {
										return cell;
									}
								}
								if (cell.rows) {
									var dataComponent = getDataComponent(cell.rows);
									if (dataComponent != null) {
										return dataComponent;
									}
								}
							}
						}
					}
					return null;
				}
				
				var page = pageInstance.page;
				// we scan the current page to see if there is a data component where we can add an event
				if (page.content.rows) {
					var dataComponent = getDataComponent(page.content.rows);
					if (dataComponent != null) {
						nabu.utils.vue.confirm({message:"Do you want to add this form to the existing data cell?"}).then(function() {
							if (name != null) {
								name = name.substring(0, 1).toUpperCase() + name.substring(1);
							}
							// we want the form in a prompt
							cell.target = "prompt";
							
							var operation = $services.swagger.operations[value];
							if (!dataComponent.state.actions) {
								Vue.set(dataComponent.state, "actions", []);
							}
							if (operation.method.toLowerCase() == "post") {
								if (name != null) {
									cell.state.title = "%" + "{Create " + name + "}";
								}
								// make sure we send out a created event once done
								cell.state.event = "created" + (name ? name : "");
								cell.state.ok = "%{Create}";
								// trigger on this create
								cell.on = "create" + (name ? name : "");
								// push an action to the datacomponent
								dataComponent.state.actions.push({
									name: "create" + (name ? name : ""),
									global: true,
									label: "%" + "{Create}",
									type: "button",
									class: "primary"
								});
								if (!dataComponent.state.refreshOn) {
									Vue.set(dataComponent.state, "refreshOn", []);
								}
								// make sure we refresh on create
								dataComponent.state.refreshOn.push("created" + (name ? name : ""));
							}
							else if (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "patch") {
								if (name != null) {
									cell.state.title = "%" + "{Update " + name + "}";
								}
								// make sure we synchronize changes so we don't need to refresh
								cell.state.synchronize = true;
								cell.state.event = "updated" + (name ? name : "");
								cell.state.ok = "%{Update}";
								// trigger on this create
								cell.on = "update" + (name ? name : "");
								// push an action to the datacomponent
								dataComponent.state.actions.push({
									name: "update" + (name ? name : ""),
									global: false,
									icon: "fa-pencil-alt",
									type: "button",
									class: "inline"
								});
								// reset events
								pageInstance.resetEvents();
								// allow for some time to stabilize events etc so we have correct definitions
								// not very clean, i know...
								setTimeout(function() {
									// generate automapping of fields
									component.autoMapFrom = cell.on;
									component.automap();
								}, 300);
							}
						});
					}
				}
			}
		});
		
		$services.router.register({
			alias: "page-youtube",
			enter: function(parameters) {
				return new nabu.page.views.Youtube({propsData: parameters});
			}
		});
		
		$services.router.register({
			alias: "page-skeleton-email",
			enter: function(parameters) {
				return new nabu.page.skeletons.Email({propsData: parameters});
			}
		});
		
		// form routes
		$services.router.register({
			alias: "page-form-text",
			enter: function(parameters) {
				parameters.formComponent = "page-form-input-text";
				parameters.configurationComponent = "page-form-input-text-configure";
				return new nabu.page.views.FormComponent({propsData: parameters});
			},
			form: "text",
			category: "Form",
			name: "Text",
			description: "An input field for plain text",
			icon: "page/core/images/form-text.svg"
		});
		$services.router.register({
			alias: "page-form-checkbox",
			enter: function(parameters) {
				parameters.formComponent = "page-form-input-checkbox";
				parameters.configurationComponent = "page-form-input-checkbox-configure";
				return new nabu.page.views.FormComponent({propsData: parameters});
			},
			form: "checkbox",
			category: "Form",
			name: "Checkbox",
			description: "A checkbox that allows you to toggle boolean values",
			icon: "page/core/images/form-checkbox.svg"
		});
		$services.router.register({
			alias: "page-form-enumeration-operation",
			enter: function(parameters) {
				parameters.formComponent = "page-form-input-enumeration-operation";
				parameters.configurationComponent = "page-form-input-enumeration-operation-configure";
				return new nabu.page.views.FormComponent({propsData: parameters});
			},
			form: "enumerationOperation",
			category: "Form",
			name: "Enumeration (Operation)",
			description: "An enumeration based on an operation",
			icon: "page/core/images/enumeration.png"
		});
		$services.router.register({
			alias: "page-form-date",
			enter: function(parameters) {
				parameters.formComponent = "page-form-input-date";
				parameters.configurationComponent = "page-form-input-date-configure";
				return new nabu.page.views.FormComponent({propsData: parameters});
			},
			form: "date",
			category: "Form",
			name: "Date",
			description: "A date component with a calendar dropdown",
			icon: "page/core/images/form-date.svg"
		});
		$services.router.register({
			alias: "page-form-switch",
			enter: function(parameters) {
				parameters.formComponent = "page-form-input-switch";
				parameters.configurationComponent = "page-form-input-switch-configure";
				return new nabu.page.views.FormComponent({propsData: parameters});
			},
			form: "switch",
			category: "Form",
			name: "Switch",
			description: "The switch component is a variant on the checkbox to toggle booleans",
			icon: "page/core/images/form-switch.svg"
		});
		$services.router.register({
			alias: "page-form-password",
			enter: function(parameters) {
				parameters.formComponent = "page-form-input-password";
				parameters.configurationComponent = "page-form-input-password-configure";
				return new nabu.page.views.FormComponent({propsData: parameters});
			},
			form: "password",
			category: "Form",
			name: "Password",
			description: "The password component allows for entering the same password twice to verify it",
			icon: "page/core/images/form-password.svg"
		});
		$services.router.register({
			alias: "page-form-richtext",
			enter: function(parameters) {
				parameters.formComponent = "page-form-input-richtext";
				parameters.configurationComponent = "page-form-input-richtext-configure";
				return new nabu.page.views.FormComponent({propsData: parameters});
			},
			form: "richtext",
			category: "Form",
			name: "Rich Text",
			description: "This input component allows you to capture rich text from the user",
			icon: "page/core/images/richtext.svg"
		});
		
		// fragment providers
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-data", 
			configure: "page-field-fragment-data-configure", 
			name: "data",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-text", 
			configure: "page-field-fragment-text-configure", 
			name: "text",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-image", 
			configure: "page-field-fragment-image-configure", 
			name: "image",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-richtext", 
			configure: "page-field-fragment-richtext-configure", 
			name: "richtext",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-javascript", 
			configure: "page-field-fragment-javascript-configure", 
			name: "javascript",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-form", 
			configure: "page-field-fragment-form-configure", 
			name: "form",
			editable: true,
			namespace: "nabu.page"
		});
		
		// form providers
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-richtext", 
			configure: "page-form-input-richtext-configure", 
			name: "richtext",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-page", 
			configure: "page-form-input-page-configure", 
			name: "page",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-text", 
			configure: "page-form-input-text-configure", 
			name: "text",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-hidden", 
			configure: "page-form-input-text-configure", 
			name: "hidden",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-password", 
			configure: "page-form-input-password-configure", 
			name: "password",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-slider", 
			configure: "page-form-input-slider-configure", 
			name: "slider",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-date", 
			configure: "page-form-input-date-configure", 
			name: "date",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-date-picker", 
			configure: "page-form-input-date-picker-configure", 
			name: "date-picker",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-switch", 
			configure: "page-form-input-switch-configure", 
			name: "switch",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-checkbox", 
			configure: "page-form-input-checkbox-configure", 
			name: "checkbox",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration", 
			configure: "page-form-input-enumeration-configure", 
			name: "enumeration",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration-provider", 
			configure: "page-form-input-enumeration-provider-configure", 
			name: "enumeration-provider",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration-operation", 
			configure: "page-form-input-enumeration-operation-configure", 
			name: "enumeration-operation",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration-array",
			configure: "page-form-input-enumeration-array-configure", 
			name: "enumeration-array",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-static-image", 
			configure: "page-form-input-static-image-configure", 
			name: "static-image",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-file", 
			configure: "page-form-input-file-configure", 
			name: "file",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-location", 
			configure: "page-form-input-location-configure", 
			name: "location",
			namespace: "google",
			multipleFields: true
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-address", 
			configure: "page-form-input-address-configure", 
			name: "address",
			namespace: "google",
			multipleFields: true
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-validate-custom", 
			configure: "page-form-input-validate-custom-configure",
			name: "validate",
			namespace: "nabu.page",
			multipleFields: true
		});	
		
		// form list providers
		nabu.page.provide("page-form-list-input", { 
			component: "page-form-list-input-dynamic", 
			configure: "page-form-list-input-dynamic-configure", 
			name: "dynamic",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-list-input", { 
			component: "page-form-list-input-predefined", 
			configure: "page-form-list-input-predefined-configure", 
			name: "predefined",
			namespace: "nabu.page"
		});
		
		// renderers
		nabu.page.provide("page-renderer", {
			name: "slider",
			component: "page-renderer-slider",
			type: "row",
			properties: ["group", "tag"]
		});
		
		nabu.page.provide("page-type", {
			name: "email",
			pageTag: "e-root",
			rowTag: "e-row",
			cellTag: "e-columns"
		});
		
		// functions
		nabu.page.provide("page-function", {
			id: "page.setAcceptedCookies",
			async: false,
			implementation: function(input, $services, $value, resolve, reject) {
				// we are expecting an object where each key is a boolean true or false
				// alternatively an array is also good
				// if true, the cookie is accepted, if not, it isn't
				var object = input.cookieObject;
				var accepted = [];
				if (object instanceof Array) {
					nabu.utils.arrays.merge(accepted, object);
				}
				else if (object) {
					Object.keys(object).forEach(function(key) {
						if (object[key]) {
							accepted.push(key);
						}
					});
				}
				$services.page.acceptCookies(accepted);
			},
			inputs: [{
				"name": "cookieObject",
				"required": true
			}]
		});
		
		nabu.page.provide("page-icon", {
			name: "Font Awesome",
			html: function(icon, additionalCss) {
				// if you don't include the fa-prefix (of any kind, like fas etc)
				// we assume you want to remain agnostic of the fa prefix and readd it
				// the chance for collission is low and can still be addressed using css
				return "<span class='icon fa " + icon + (additionalCss ? " " + additionalCss : "") + (icon.indexOf("fa") != 0 ? " fa-" + icon : "") + "'></span>";
			},
			priority: -1,
			allowOther: true,
			icons: []
		});
		
		// formatters
		nabu.page.provide("page-format", {
			format: function(id, fragment, page, cell, record) {
				var properties = null;
				var self = this;
				var pageInstance = $services.page.getPageInstance(page, this);
				if (fragment && fragment.resolveOperationBinding) {
					properties = {};
					Object.keys(fragment.resolveOperationBinding).map(function(key) {
						if (fragment.resolveOperationBinding[key]) {
							// looking inside the current record
							if (fragment.resolveOperationBinding[key].indexOf("record.") == 0) {
								properties[key] = record ? $services.page.getValue(record, fragment.resolveOperationBinding[key].substring("record.".length)) : null;
							}
							else {
								var bindingValue = $services.page.getBindingValue(pageInstance, fragment.resolveOperationBinding[key]);
								properties[key] = bindingValue;
							}
						}
					});
				}
				var result = $services.pageResolver.resolve(fragment.resolveOperation, fragment.resolveOperationIds, fragment.resolveOperationId, id, properties);
				// the content is not there yet at time of serialization, need to update when it is...
				// put the resulting string in watched storage, use updated in the component to redo the string!
				if (result && fragment.resolveOperationLabelComplex) {
					
					var storageId = "resolve." + JSON.stringify(fragment) + "." + fragment.resolveOperation + "." + id;
					storageId = storageId.replace(/\./g, "_");
					// always check to prevent unending loops
					if (pageInstance.retrieve(storageId) != null) {
						return pageInstance.retrieve(storageId);
					}
					pageInstance.store(storageId, "");
					
					// not sure why, but need to take it out of the synchronous execution...
					setTimeout(function() {
						var updateFunction = function() {
							if (pageInstance.retrieve(storageId) != component.$el.innerHTML) {
								pageInstance.store(storageId, component.$el.innerHTML);
							}
						};
						var component = new nabu.page.views.PageFields({ propsData: {
							page: nabu.utils.objects.deepClone(page),
							cell: nabu.utils.objects.deepClone({state:fragment}),
							edit: false,
							data: result,
							label: false,
							fieldsName: "resolveFields"
						}, updated: updateFunction, ready: updateFunction });
						component.$mount();
					}, 1);
					
					return pageInstance.retrieve(storageId);
				}
				else {
					return result && fragment.resolveOperationLabel ? result[fragment.resolveOperationLabel] : result;
				}
			},
			skipCompile: true,
			html: true,
			configure: "page-format-resolver",
			name: "resolve",
			namespace: "nabu.page"
		});
		
		nabu.page.provide("page-format", {
			format: function(value) {
				try {
					var page = new nabu.page.views.Page({
						propsData: {
							embedded: true,
							page: {
								name: "dynamic-page-" + application.services.page.counter++,
								content: application.services.page.normalize(value ? JSON.parse(value) : {})
							}
						}
					});
					return page.$mount().$el;
				}
				catch (exception) {
					return null;
				}
			},
			html: true,
			skipCompile: true,
			name: "page",
			namespace: "nabu.page"
		});
		
		nabu.page.provide("page-format", {
			format: function(value) {
				return "<a ref='noopener noreferrer nofollow' href='tel:" + value + "'>" + value + "</a>";
			},
			html: true,
			skipCompile: true,
			name: "phone",
			namespace: "nabu.page"
		});
		
		nabu.page.provide("page-format", {
			format: function(value) {
				return "<a ref='noopener noreferrer nofollow' href='mailto:" + value + "'>" + value + "</a>";
			},
			html: true,
			skipCompile: true,
			name: "email",
			namespace: "nabu.page"
		});
		
		Vue.component("page-percentage-slider-configurator", {
			props: {
				page: {
					type: Object,
					required: true
				},
				cell: {
					type: Object,
					required: true
				},
				fragment: {
					type: Object,
					required: true
				}
			},
			template: "<div><n-form-switch v-model='fragment.percentageReverse' label='Reverse percentage'/><n-form-switch v-model='fragment.percentageSmallRange' label='Is [0-1] range' /><n-form-text v-model='fragment.round' label='Round Number'/></div>"
		});
			
		nabu.page.provide("page-format", {
			format: function(value, fragment, page, cell) {
				if (fragment && fragment.percentageSmallRange && value) {
					value *= 100;
				}
				if (fragment && fragment.percentageReverse && value != null) {
					value = 100 - value;
				}
				if (fragment && fragment.round && value != null) {
					value = parseFloat($services.formatter.number(value, parseInt(fragment.round)));
				}
				// make sure it ends up within the range, otherwise we can't display it well
				// it seems that if you set a negative number, it just takes Math.abs()?
				if (value < 0) {
					value = 0;
				}
				if (value > 100) {
					value = 100;
				}
				return "<input disabled='true' type='range' value='" + value + "' minimum='0' step='1' maximum='100' :value='" + value + "'/>";
			},
			html: true,
			skipCompile: false,
			name: "percentage-slider",
			configure: "page-percentage-slider-configurator",
			namespace: "nabu.page"
		});
		
		var blocksToHighlight = [];
		var highlightFormatter = function(value, syntax) {
			if ($services.vue.$highlightCounter == null) {
				$services.vue.$highlightCounter = 1;
			}
			var id = "format_highlight_" + $services.vue.$highlightCounter++;
			var clazz = syntax ? " class='" + syntax + "'" : "";
			var result = value == null ? null :
				"<pre id='" + id + "'" + clazz + "><code>" + value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</code></pre>";
				
			setTimeout(function() {
				if (!$services.vue.$highlightLoaded) {
					$services.vue.$highlightLoaded = [];
				}
				var loaded = $services.vue.$highlightLoaded;
				
				var highlight = function(id) {
					hljs.highlightBlock(document.getElementById(id));
				}
				
				if (!window.hljs) {
					blocksToHighlight.push(id);
					if (loaded.indexOf("$main") < 0) {
						loaded.push("$main");
						var script = document.createElement("script");
						script.setAttribute("type", "text/javascript");
						script.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/highlight.min.js");
						document.head.appendChild(script);
						script.onload = function() {
							blocksToHighlight.forEach(highlight);
						}
						var link = document.createElement("link");
						link.rel = "stylesheet";
						link.href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.13.1/styles/default.min.css";
						document.head.appendChild(link);
					}
				}
				else {
					highlight(id);
				}
			}, 1);
			
			return result;
		};
		nabu.page.provide("page-format", {
			format: highlightFormatter,
			html: true,
			skipCompile: true,
			name: "highlight",
			namespace: "nabu.page"
		});
		
		var markdownToParse = [];
		nabu.page.provide("page-format", {
			format: function(value) {
				if ($services.vue.$highlightCounter == null) {
					$services.vue.$highlightCounter = 1;
				}
				var id = "format_markdown_" + $services.vue.$highlightCounter++;
				var result = value == null ? null : "<div id='" + id + "'>" + value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</div>";
				var compile = function(id) {
					var converter = new showdown.Converter();
					converter.setFlavor('github');
					var part = document.getElementById(id);
					if (part) {
						part.innerHTML = nabu.utils.elements.sanitize(converter.makeHtml(part.innerHTML)).replace(/&amp;lt;/g, "&lt;").replace(/&amp;gt;/g, "&gt;");
					}
				};
				setTimeout(function() {
					if (!window.showdown) {
						markdownToParse.push(id);
						if (!$services.vue.$markdownLoaded) {
							$services.vue.$markdownLoaded = true;
							var script = document.createElement("script");
							script.setAttribute("type", "text/javascript");
							script.setAttribute("src", "https://cdnjs.cloudflare.com/ajax/libs/showdown/1.9.0/showdown.min.js");
							document.head.appendChild(script);
							script.onload = function() {
								markdownToParse.forEach(compile);
							}
						}
					}
					else {
						compile(id);
					}
				}, 1);
				
				return result;
			},
			html: true,
			skipCompile: true,
			name: "markdown",
			namespace: "nabu.page"
		});
		
		return $services.$register({
			page: nabu.page.services.Page,
			pageResolver: nabu.page.services.PageResolver,
			resizer: nabu.page.services.Resizer,
			formatter: nabu.page.services.Formatter
		});
	});
	
});