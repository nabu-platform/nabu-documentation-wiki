if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

// there is a hardcoded exception in the focus for fields known to use the combo box as this immediately shows the combo box dropdown
// this component uses a mixture of objects and "." separated syntax for legacy reasons

// the form tries to copy state (for pages) before allowing you to edit it, to then merge the result back into the source
// however because the form copies all page data, if a value differs, it is not entirely sure whether that is because YOU updated it or something else did
// that's why we keep the reference

// the synchronize generally triggers a rerender of the form which in turn means we lose focus

nabu.page.formComponentConstructer = function(name) {
	return Vue.component(name, {
		template: "#" + name,
		props: {
			page: {
				type: Object,
				required: true
			},
			parameters: {
				type: Object,
				required: false
			},
			cell: {
				type: Object,
				required: true
			},
			edit: {
				type: Boolean,
				required: true
			}
		},
		data: function() {
			return {
				configuring: false,
				subscriptions: [],
				result: {},
				// the original data (if possible), we want to be able to only update changed values
				reference: {},
				currentPage: null,
				autoMapFrom: null,
				messages: [],
				readOnly: false,
				// keeps track of the labels set by the fields (if relevant)
				labels: {},
				doingIt: false,
				started: null,
				error: null
			}
		},
		beforeDestroy: function() {
			this.subscriptions.map(function(x) {
				x();
			});
		},
		computed: {
			codes: function() {
				var codes = {};
				if (this.cell.state.codes) {
					var self = this;
					this.cell.state.codes.forEach(function(code) {
						codes[code.code] = self.$services.page.translate(code.title);
					});
				}
				return codes;
			},
			analysisId: function() {
				var id = this.cell.state.analysisId;
				if (!id) {
					id = this.cell.state.formId;
				}
				// if we have nothing specific, we assume there is only one form on the page
				if (!id) {
					id = this.page.name;
				}
				return id;
			},
			operation: function() {
				return this.cell.state.operation ? this.$services.swagger.operations[this.cell.state.operation] : null;
			},
			body: function() {
				var operation = this.$services.swagger.operations[this.cell.state.operation];
				if (operation) {
					var self = this;
					for (var i = 0; i < operation.parameters.length; i++) {
						var parameter = operation.parameters[i];
						if (parameter.in == "body") {
							return self.$services.swagger.resolve(parameter);
						}
					};
				}
				return {};
			},
			availableParameters: function() {
				return this.$services.page.getAvailableParameters(this.page, this.cell, true);
			},
			fieldsToAdd: function() {
				var fields = [];
				var self = this;
				if (this.cell.state.pageForm) {
					var parameters = this.$services.page.getPageParameters(this.page);
					//nabu.utils.arrays.merge(fields, Object.keys(parameters.properties));
					nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor(parameters, true, true));
				}
				else if (this.cell.state.functionForm) {
					if (this.cell.state.functionId) {
						var parameters = this.$services.page.getFunctionInput(this.cell.state.functionId);
						nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor(parameters, true, true));
					}
				}
				else if (true) {
					nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor({properties:this.getOperationInput()}, true, true));
				}
				else {
					Object.keys(this.cell.bindings).map(function(key) {
						fields.push(key);
					});
				}
				return fields;
			},
			self: function() {
				return this;
			},
			form: function() {
				return this;
			}
		},
		created: function() {
			// non-reactive cached schemas
			// this was introduced for the following scenario:
			// if you have a page form and that page has page parameters (or initial state?) that uses parameters defined in the swagger
			// the act of resolving the parameters through getPageParameters and more specifically getResolvedPageParameterType:
			// leads to an "infinite render" loop problem
			// it is entirely unclear why this happens but we had a similar problem where using getPageParameters triggered an infinite render loop
			// possibly we need/want the cache at the page service level for getResolvedPageParameterType?
			// however this cache would be application wide
			// for now, we opt for this option but should we add a cache at the page service level, we may want to revisit this
			this.schemas = {};
			this.normalize(this.cell.state);
			
			this.initialize();
			
			// make sure we set the cell state for the form
			this.cell.cellState = {
				form: this.createResultDefinition()
			};
			
			if (this.cell.state.allowReadOnly && this.cell.state.startAsReadOnly) {
				this.readOnly = true;
			}
			this.started = new Date();
			
			if (this.cell.state.submitOnEvent) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				this.cell.state.submitOnEvent.forEach(function(x) {
					self.subscriptions.push(pageInstance.subscribe(x, function() {
						self.doIt();
					}));
				});
			}
			
			if (this.cell.state.cancelOnEvent) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				this.cell.state.cancelOnEvent.forEach(function(x) {
					self.subscriptions.push(pageInstance.subscribe(x, function() {
						self.cancel();
					}));
				});
			}
		},
		// want ready because we need correct root
		ready: function() {
			var self = this;
			this.formListener = this.$root.$on("form-opened", function(form) {
				if (self.cell.state.onlyOneEdit && form != self && !self.readOnly) {
					self.cancel();
				}
			});
		},
		methods: {
			generateForm: function() {
				var self = this;
				var page = this.cell.state.pages[0];
				// by default we want inline reporting of exceptions
				this.cell.state.mode = "component";
	
				var ignoreParameters = [];			
				// if we have an operation, we assume path parameters are ids that are not filled in manually but piped from other places
				if (this.cell.state.operation) {
					var operation = this.$services.swagger.operations[this.cell.state.operation];
					if (operation && operation.parameters) {
						nabu.utils.arrays.merge(ignoreParameters, operation.parameters.filter(function(x) {
							return x.in == "path";
						}).map(function(x) {
							return x.name;
						}));
					}
				}
				this.fieldsToAdd.forEach(function(field) {
					if (field != "body" && ignoreParameters.indexOf(field) < 0) {
						var parts = field.split(".");
						var schema = self.getSchemaFor(field);
						var type = "text";
						var textType = null;
						
						var add = {
							arbitrary: false,
							name: field,
							label: "%" + "{" + self.$services.formatter.conventionize(parts[parts.length - 1]) + "}",
							description: null,
							type: "text",
							enumerations: [],
							value: null,
							group: null,
							joinGroup: false
						};
						
						if (schema.format && schema.format.indexOf("date") >= 0) {
							add.type = "date";
						}
						else if (schema.type == "boolean") {
							add.type = "switch";
						}
						else if (schema.type == "integer") {
							add.textType = "number";
						}
						// if we have a uuid as target, it is definitely not a regular input field
						// you probably want a resolver method or masterdata
						// for masterdata, the category is usually named the same as the value (minus Id)
						// it is pretty hard to deduce what enumeration service you want at this point...
						else if (schema.format == "uuid") {
							add.type = "enumeration-operation";
							var fieldName = parts[parts.length - 1];
							if (fieldName.substring(fieldName.length - 2, fieldName.length) == "Id") {
								fieldName = fieldName.substring(0, fieldName.length - 2);
								if (self.$services.masterdata.categories.filter(function(x) { return x.name == fieldName })) {
									add.enumerationOperation = "nabu.cms.core.rest.masterdata.category.suggest";
									add.enumerationOperationLabel = "label";
									add.enumerationOperationValue = "id";
									add.enumerationOperationQuery = "q";
								}
							}
						}
						// if we see a "password" field, use that type
						else if (field.indexOf("password") >= 0) {
							add.type = "password";
						}
						page.fields.push(add);
					}
				});
			},
			dragOver: function($event) {
				var data = $event.dataTransfer.getData("form-name");
				console.log("dragged", data);
				if (data) {
					this.$services.page.pushDragItem(this.$el);
					this.$el.classList.add("hovering");
					$event.stopPropagation();
					$event.preventDefault();
				}
			},
			dragExit: function($event) {
				this.$el.classList.remove("hovering");
			},
			drop: function($event) {
				var data = $event.dataTransfer.getData("form-name");
				if (data) {
					this.currentPage.fields.push({
						arbitrary: false,
						name: null,
						label: null,
						description: null,
						type: data,
						enumerations: [],
						value: null,
						group: null,
						joinGroup: false
					});
					$event.stopPropagation();
					$event.preventDefault();
				}
			},
			getCurrentValue: function(field) {
				var currentValue = this.result[field.name];
				if (!this.result.hasOwnProperty(field.name)) {
					currentValue = this.$services.page.getValue(this.result, field.name);
					// might be overkill, currently done for backwards compatibility
					if (currentValue != null) {
						Vue.set(this.result, field.name, currentValue);
					}
				}
				return currentValue;
			},
			initializePageForm: function() {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// we currently only copy the root variables, this means complex objects have their values copied "by reference"
				// we use getCurrentValue to get the current value recursively to bind them to our fields
				// but at that point we persist them as "." separated values which means updated values don't end up in the resulting object
				// this means if we have a . separated field, it is already synced "correctly" as a diff, it is only for root fields that we have an issue
				var reference = {};
				/*Vue.set(this, "result", {});
				var page = this.$services.page.getPageParameterValues(self.page, pageInstance);
				Object.keys(page).map(function(key) {
					// we currently only use the reference to check if fields have changed
					// we currently only check this with the dot-based notation, never the object notation
					// as such we can explode into a separate object
					// the problem is: the explode takes into account vue components etc that can not be iterated upon, but if you still have the original result
					// then the JSON.stringify might fail with recursive references
					// we just explode it after
					//reference[key] = page[key];
					Vue.set(self.result, key, page[key]);
				});*/
				// we _need_ to take a serialized copy of the state, otherwise the createResult will always update the state when trying to create a result object
				var page = this.$services.page.getPageParameterValues(self.page, pageInstance);
				// take a cloned copy
				Vue.set(this, "result", JSON.parse(JSON.stringify(page)));
				// must recreate the "." separated values, necessary for "complex" multifield form components like address
				// other components get a correct initial value because we get the field from the result (getCurrentValue)
				//this.$services.page.explode(reference, this.result);
				// explode to get correct values
				this.$services.page.explode(this.result, this.result);
				//Vue.set(this, "reference", JSON.parse(JSON.stringify(reference)));
				//Vue.set(this, "reference", reference);
				Vue.set(this, "reference", JSON.parse(JSON.stringify(this.result)));
			},
			hasChanged: function(path, value) {
				if (this.cell.state.pageForm) {
					var originalValue = this.reference[path];
					//var originalValue = this.$services.page.getValue(this.reference, path);
					return value !== originalValue;
				}
				// for now...
				else {
					return true;
				}
			},
			initialize: function() {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// if we are updating the page itself, get the parameters from there
				if (this.cell.state.pageForm) {
					/*
					var page = this.$services.page.getPageParameterValues(self.page, pageInstance);
					Object.keys(page).map(function(key) {
						Vue.set(self.result, key, page[key]);
					});
					*/
					this.initializePageForm();
				}
				else if (this.cell.bindings) {
					Object.keys(this.cell.bindings).map(function(key) {
						if (self.cell.bindings[key]) {
							var bindingValue = self.$services.page.getBindingValue(pageInstance, self.cell.bindings[key]);
							// duplicate the arrays to prevent refresh issues
							// suppose in our form we add one to the form, but the entire array is watched, then the form is rerendered and rebound
							// additionally we want to be able to "cancel" our form without having the changes persisted, hence the object clone
							// TODO: the same could be set for objects themselves with fields being directly altered by reference, might need more work then
							if (bindingValue instanceof Array) {
								var cloned = bindingValue.map(function(x) { return nabu.utils.objects.clone(x) });
								if (self.result[key] instanceof Array) {
									self.result[key].splice(0);
									nabu.utils.arrays.merge(self.result[key], cloned);
								}
								else {
									Vue.set(self.result, key, cloned);
								}
							}
							else {
								Vue.set(self.result, key, bindingValue);
							}
						}
					});
				}
				
				// get the first page
				this.currentPage = this.cell.state.pages[0];
				
				this.$services.analysis.push({
					pageName: this.page.content.name,
					pageCategory: this.page.content.category,
					category: "form",
					type: "form-page",
					counter: 0,
					method: "start",
					group: this.analysisId,
					event: this.analysisId + "-page-0"
				});
				// DEPRECATED
				if (this.$services.analysis && this.$services.analysis.emit) {
					this.$services.analysis.emit("form-page-0", this.analysisId, null, true);
				}
			},
			automap: function() {
				var source = this.availableParameters[this.autoMapFrom];
				var self = this;
				this.fieldsToAdd.forEach(function(key) {
				//Object.keys(this.cell.bindings).map(function(key) {
					// only automap those that are not filled in
					if (!self.cell.bindings[key]) {
						var keyToCheck = key;
						while (keyToCheck) {
							if (!!source.properties[keyToCheck]) {
								Vue.set(self.cell.bindings, key, self.autoMapFrom + "." + keyToCheck);
								break;
							}
							var index = keyToCheck.indexOf(".");
							if (index < 0) {
								break;
							}
							keyToCheck = keyToCheck.substring(index + 1);
						}
					}
				});
			},
			isHidden: function(field) {
				return !!field.hidden && this.$services.page.isCondition(field.hidden, this.createResult(), this);
			},
			isDisabled: function(field) {
				return !!field.disabled && this.$services.page.isCondition(field.disabled, this.createResult(), this);
			},
			getGroupedFields: function(page) {
				var groupedFields = [];
				page.fields.map(function(field) {
					// if we want to join the current group, just do that
					if (field.joinGroup === true) {
						if (groupedFields.length == 0) {
							groupedFields.push({fields:[]});
						}
						groupedFields[groupedFields.length - 1].fields.push(field);
					}
					else {
						groupedFields.push({group:field.group, fields:[field]});
					}
				});
				return groupedFields;
			},
			nextPage: function() {
				var messages = this.$refs.form.validate();
				if (!messages.length) {
					this.currentPage = this.cell.state.pages[this.cell.state.pages.indexOf(this.currentPage) + 1];
					this.$services.analysis.push({
						pageName: this.page.content.name,
						pageCategory: this.page.content.category,
						category: "form",
						type: "form-page",
						counter: this.cell.state.pages.indexOf(this.currentPage),
						method: "next",
						group: this.analysisId,
						event: this.analysisId + "-page-" + this.cell.state.pages.indexOf(this.currentPage)
					});
					// DEPRECATED
					if (this.$services.analysis && this.$services.analysis.emit) {
						this.$services.analysis.emit("form-page-" + this.cell.state.pages.indexOf(this.currentPage), this.analysisId, {method: "next"}, true);
					}
				}
				else {
					this.scrollToException(messages);
				}
			},
			scrollToException: function(messages) {
				for (var i = 0; i < messages.length; i++) {
					if (messages[i].component && messages[i].component.$el) {
						messages[i].component.$el.scrollIntoView(true);
						break;
					}
				}
			},
			previousPage: function() {
				if (this.cell.state.pages.indexOf(this.currentPage) >= 1) {
					this.currentPage = this.cell.state.pages[this.cell.state.pages.indexOf(this.currentPage) - 1];
					this.$services.analysis.push({
						pageName: this.page.content.name,
						pageCategory: this.page.content.category,
						category: "form",
						type: "form-page",
						counter: this.cell.state.pages.indexOf(this.currentPage),
						method: "previous",
						group: this.analysisId,
						event: this.analysisId + "-page-" + this.cell.state.pages.indexOf(this.currentPage)
					});
					// DEPRECATED
					if (this.$services.analysis && this.$services.analysis.emit) {
						this.$services.analysis.emit("form-page-" + this.cell.state.pages.indexOf(this.currentPage), this.analysisId, {method: "previous"}, true);
					}
				}
			},
			setPage: function(page) {
				var messages = this.$refs.form.validate();
				if (!messages.length || this.edit) {
					this.currentPage = page;
					this.$services.analysis.push({
						pageName: this.page.content.name,
						pageCategory: this.page.content.category,
						category: "form",
						type: "form-page",
						counter: this.cell.state.pages.indexOf(this.currentPage),
						method: "choose",
						group: this.analysisId,
						event: this.analysisId + "-page-" + this.cell.state.pages.indexOf(this.currentPage)
					});
					// DEPRECATED
					if (this.$services.analysis && this.$services.analysis.emit) {
						this.$services.analysis.emit("form-page-" + this.cell.state.pages.indexOf(this.currentPage), this.analysisId, {method: "choose"}, true);
					}
				}
			},
			deletePage: function(page) {
				var self = this;
				this.$confirm({
					message: "Are you sure you want to delete the form page '" + page.name + "'?"
				}).then(function() {
					self.cell.state.pages.splice(self.cell.state.pages.indexOf(page), 1);
				});
			},
			addPage: function() {
				this.cell.state.pages.push({
					name: "Unnamed Page",
					title: null,
					fields: []
				});
			},
			upPage: function(page) {
				var index = this.cell.state.pages.indexOf(page);
				if (index > 0) {
					var replacement = this.cell.state.pages[index - 1];
					this.cell.state.pages.splice(index - 1, 1, this.cell.state.pages[index]);
					this.cell.state.pages.splice(index, 1, replacement);
				}
			},
			downPage: function(page) {
				var index = this.cell.state.pages.indexOf(page);
				if (index < this.cell.state.pages.length - 1) {
					var replacement = this.cell.state.pages[index + 1];
					this.cell.state.pages.splice(index + 1, 1, this.cell.state.pages[index]);
					this.cell.state.pages.splice(index, 1, replacement);
				}
			},
			upAllPage: function(page) {
				var index = this.cell.state.pages.indexOf(page);
				if (index > 0) {
					this.cell.state.pages.splice(index, 1);
					this.cell.state.pages.unshift(page);
				}
			},
			downAllPage: function(page) {
				var index = this.cell.state.pages.indexOf(page);
				if (index < this.cell.state.pages.length - 1) {
					this.cell.state.pages.splice(index, 1);
					this.cell.state.pages.push(page);
				}
			},
			copyPage: function(page) {
				this.cell.state.pages.push(nabu.utils.objects.deepClone(page));
			},
			configurator: function() {
				return "page-form-configure-all";
			},
			configure: function() {
				if (this.cell.state.autoclose == null) {
					Vue.set(this.cell.state, "autoclose", true);
				}
				this.configuring = true;	
			},
			normalize: function(state) {
				if (!state.hasOwnProperty("title")) {
					Vue.set(state, "title", null);
				}
				if (!state.hasOwnProperty("immediate")) {
					Vue.set(state, "immediate", false);
				}
				if (!(state.pages instanceof Array)) {
					Vue.set(state, "pages", []);
				}
				// if we still have fields directly in the state, it is actually a form with one page (the old way)
				if (state.fields) {
					state.pages.push({
						name: "Form Fields",
						title: null,
						fields: state.fields
					});
					Vue.delete(state, "fields");
				}
				if (!state.pages.length) {
					state.pages.push({
						name: "Form Fields",
						title: null,
						fields: []
					});
				}
				if (!state.hasOwnProperty("class")) {
					Vue.set(state, "class", null);
				}
				if (!state.hasOwnProperty("ok")) {
					Vue.set(state, "ok", "Ok");
				}
				if (!state.hasOwnProperty("edit")) {
					Vue.set(state, "edit", "Edit");
				}
				if (!state.hasOwnProperty("next")) {
					Vue.set(state, "next", "Next");
				}
				if (!state.hasOwnProperty("cancel")) {
					Vue.set(state, "cancel", "Cancel");
				}
				if (!state.hasOwnProperty("event")) {
					Vue.set(state, "event", null);
				}
				if (!state.hasOwnProperty("synchronize")) {
					Vue.set(state, "synchronize", false);
				}
			},
			getEvents: function() {
				var result = {};
				if (this.cell.state.functionForm && this.cell.state.event) {
					result[this.cell.state.event] = this.cell.state.functionId
						? this.$services.page.getFunctionOutput(this.cell.state.functionId)
						: {};
				}
				else if (this.operation && this.cell.state.event) {
					var response = this.operation.responses["200"];
					var schema = null;
					if (response && response.schema) {
						schema = this.$services.swagger.resolve(response.schema);
					}
					if (schema == null) {
						schema = {properties:this.getOperationInput()};
					}
					result[this.cell.state.event] = schema ? schema : {};
				}
				else if (this.cell.state.event) {
					result[this.cell.state.event] = this.cell.on ? this.cell.on : {};
				}
				if (this.cell.state.submitEvent) {
					if (this.cell.state.functionForm) {
						result[this.cell.state.submitEvent] = this.$services.page.getFunctionInput(this.cell.state.functionId);
					}
					else {
						result[this.cell.state.submitEvent] = {properties:this.getOperationInput()};
					}
				}
				if (this.cell.state.cancelEvent) {
					result[this.cell.state.cancelEvent] = this.cell.on ? this.cell.on : {};
				}
				if (this.cell.state.errorEvent) {
					result[this.cell.state.errorEvent] = this.$services.swagger.resolve("#/definitions/StructuredErrorResponse");
				}
				this.cell.state.pages.forEach(function(page) {
					if (page.fields) {
						page.fields.forEach(function(field) {
							var event = nabu.page.event.getName(field, "validationSuccessEvent");
							if (event != null) {
								result[event] = {};
							}
						})
					}
				});
				nabu.utils.objects.merge(result, this.getEventsRecursively(this));
				return result;
			},
			getEventsRecursively: function(component) {
				var events = {};
				if (component.$children) {
					var self = this;
					component.$children.forEach(function(child) {
						if (child.getEvents) {
							nabu.utils.objects.merge(events, child.getEvents());
						}
						else {
							nabu.utils.objects.merge(events, self.getEventsRecursively(child));
						}
					});
				}
				return events;
			},
			getOperationInput: function() {
				var result = {};
				var self = this;
				if (this.cell.state.operation) {
					var operation = this.$services.swagger.operations[this.cell.state.operation];
					if (operation && operation.parameters) {
						operation.parameters.forEach(function(parameter) {
							if (parameter.in == "body") {
								var type = self.$services.swagger.resolve(parameter);
								result[parameter.name] = type.schema;
							}
							else {
								result[parameter.name] = parameter;
							}
						})
					}
				}
				return result;
			},
			cancel: function() {
				if (!this.doingIt) {
					if (this.cell.state.cancelEvent) {
						var pageInstance = this.$services.page.getPageInstance(this.page, this);
						var content = null;
						if (this.cell.on) {
							content = pageInstance.get(this.cell.on);
						}
						if (content == null) {
							content = {};
						}
						pageInstance.emit(this.cell.state.cancelEvent, content);
					}
						this.$emit('close');
					if (!this.cell.state.cancelEvent || this.cell.state.autoclose) {
					}
					if (this.cell.state.allowReadOnly) {
						this.readOnly = true;
						// reinitialize
						this.initialize();
						this.resetValidation();
					}
					this.$services.analysis.push({
						pageName: this.page.content.name,
						pageCategory: this.page.content.category,
						category: "form",
						type: "form-cancel",
						group: this.analysisId,
						event: this.analysisId + "-cancel"
					});
					// DEPRECATED
					if (this.$services.analysis && this.$services.analysis.emit) {
						this.$services.analysis.emit("form-cancel", this.analysisId, null, true);
					}
				}
			},
			resetValidation: function(component) {
				if (component == null) {
					component = this.$refs.form;
				}
				if (component.valid != null) {
					component.valid = null;
				}
				if (component.$children) {
					for (var i = 0; i < component.$children.length; i++) {
						this.resetValidation(component.$children[i]);
					}
				}
			},
			getOperations: function(name) {
				var self = this;
				return this.$services.page.getOperations(function(operation) {
					// must be a put, post, patch or delete
					return (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "post" || operation.method.toLowerCase() == "delete" || operation.method.toLowerCase() == "patch")
						// and contain the name fragment (if any)
						&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0);
				});
			},
			getField: function(name) {
				for (var i = 0; i < this.cell.state.pages.length; i++) {
					var field = this.cell.state.pages[i].fields.filter(function(x) {
						return x.name == name;
					})[0];
					if (field) {
						return field;
					}
				}
			},
			updateOperation: function(operation) {
				this.cell.state.operation = !operation ? null : operation.id;
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
										bindings[newKey] = self.cell.bindings && self.cell.bindings[newKey]
											? self.cell.bindings[newKey]
											: null;
									}
									if (type.schema.properties[key].type == "object" || (type.schema.properties[key].type == "array" && type.schema.properties[key].items.properties)) {
										var properties = type.schema.properties[key].type == "array"
											? type.schema.properties[key].items.properties 
											: type.schema.properties[key].properties;
										Object.keys(properties).map(function(key2) {
											var newKey = "body." + key + "." + key2;
											bindings[newKey] = self.cell.bindings && self.cell.bindings[newKey]
												? self.cell.bindings[newKey]
												: null;	
										});
									}
								});
							}
							// if we have a binary body, expose that
							else if (type.schema.type == "string" && type.schema.format == "binary") {
								bindings["body"] =  self.cell.bindings && self.cell.bindings["body"]
									? self.cell.bindings["body"]
									: null;
							}
						}
						else {
							bindings[parameter.name] = self.cell.bindings && self.cell.bindings[parameter.name]
								? self.cell.bindings[parameter.name]
								: null;
						}
					});
				}
				// if we are event driven, do a best-effort mapping if the fields match
				if (this.cell.on) {
					var self = this;
					var pageInstance = self.$services.page.getPageInstance(self.page, self);
					var event = pageInstance.getEvents()[this.cell.on];
					if (event && event.properties) {
						Object.keys(bindings).map(function(key) {
							var field = key;
							if (field.indexOf("body.") == 0) {
								field = field.substring("body.".length);
							}
							if (event.properties[field]) {
								bindings[key] = self.cell.on + "." + field;
							}
						});
					}
				}
				// TODO: is it OK that we simply remove all bindings?
				// is the table the only one who sets bindings here?
				Vue.set(this.cell, "bindings", bindings);
			},
			getSchemaFor: function(field) {
				if (!field) {
					return null;
				}
				if (!this.schemas[field]) {
					var recursiveGet = function(schema, parts, index) {
						if (schema.items) {
							schema = schema.items;
						}
						var properties = schema.properties;
						if (properties && properties[parts[index]]) {
							if (index < parts.length - 1) {
								return recursiveGet(properties[parts[index]], parts, index + 1);
							}
							else {
								var result = properties[parts[index]];
								result.required = result.required || schema.required && schema.required.indexOf(parts[index]) >= 0;
								return result;
							}
						}
					}
					if (this.cell.state.functionForm) {
						var properties = this.$services.page.getFunctionInput(this.cell.state.functionId);
						var parts = field.split(".");
						result = properties ? recursiveGet(properties, parts, 0) : null;
					}
					else if (this.cell.state.pageForm) {
						var definition = this.$services.page.getPageParameters(this.page);
						var parts = field.split(".");
						result = definition ? recursiveGet(definition, parts, 0) : null;
					}
					else {
						var operation = this.$services.swagger.operations[this.cell.state.operation];
						var result = null;
						if (operation) {
							var self = this;
							// body parameter
							if (field.indexOf("body.") == 0) {
								var body = this.body;
								var parts = field.substring("body.".length).split(".");
								result = body.schema ? recursiveGet(body.schema, parts, 0) : null;
							}
							// non-body parameter
							else {
								for (var i = 0; i < operation.parameters.length; i++) {
									var parameter = operation.parameters[i];
									if (parameter.in != "body" && parameter.name == field) {
										result = parameter;
									}
								};
							}
						}
					}
					this.schemas[field] = result;
				}
				return this.schemas[field];
			},
			isList: function(field) {
				var field = this.getSchemaFor(field);
				return field && field.type == "array";
			},
			isPartOfList: function(field) {
				// only things in the body can be a list (?)
				if (!field || field.indexOf("body.") != 0) {
					return false;
				}
				var parts = field.substring("body.".length).split(".");
				var schema = this.body.schema;
				for (var i = 0; i < parts.length - 1; i++) {
					if (schema.items) {
						schema = schema.items;
					}
					schema = schema.properties[parts[i]];
					if (schema && schema.type == "array") {
						return true;	
					}
				}
				return false;
			},
			set: function(key, value) {
				this.result[key] = value;
			},
			getProvidedListComponent: function(type) {
				var provided = nabu.page.providers("page-form-list-input").filter(function(x) {
					 return x.name == type;
				})[0];
				return provided ? provided.component : null;	
			},
			addInstanceOfField: function(field) {
				if (!this.result[field.name]) {
					Vue.set(this.result, field.name, []);
				}
				var schema = this.getSchemaFor(field.name);
				if (schema.items) {
					schema = schema.items;
				}
				var result = null;
				if (schema.properties) {
					result = {};
					Object.keys(schema.properties).map(function(key) {
						result[key] = null;
					});
				}
				this.result[field.name].push(result);
			},
			createResultDefinition: function() {
				var result = {properties: {}};
				if (this.operation && this.operation.parameters) {
					var self = this;
					Object.keys(this.operation.parameters).map(function(key) {
						if (self.operation.parameters[key].schema) {
							result.properties[self.operation.parameters[key].name] = self.$services.swagger.resolve(self.operation.parameters[key].schema);
						}
						else {
							result.properties[self.operation.parameters[key].name] = self.operation.parameters[key];
						}
					});
				}
				return result;
			},
			createResult: function() {
				var result = this.result;
				var transformed = {};
				Object.keys(result).map(function(name) {
					var parts = name.split(".");
					var tmp = transformed;
					for (var i = 0; i < parts.length - 1; i++) {
						if (tmp[parts[i]] == null) {
							Vue.set(tmp, parts[i], {});
						}
						tmp = tmp[parts[i]];
					}
					// merge them, note that typeof(null) == "object"...
					if (tmp[parts[parts.length - 1]] != null && typeof(tmp[parts[parts.length - 1]]) == "object") {
						nabu.utils.objects.merge(tmp[parts[parts.length - 1]], result[name]);
					}
					else {
						Vue.set(tmp, parts[parts.length - 1], result[name]);
					}
					// if it is a complex field, set the string value as well
					// this makes it easier to check later on if it has been set or not
					if (name.indexOf(".") > 0) {
						// set the full name field as well
						transformed[name] = result[name];
					}
				});
				var self = this;
				// no need, this is bound in the created() hook into this.result so picked up in the above mapping (unless overwritten)
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// bind additional stuff from the page
				Object.keys(this.cell.bindings).map(function(name) {
					// don't overwrite manually set values
					if (self.cell.bindings[name] && Object.keys(transformed).indexOf(name) < 0 && Object.keys(result).indexOf(name) < 0) {
						var parts = name.split(".");
						var tmp = transformed;
						for (var i = 0; i < parts.length - 1; i++) {
							if (!tmp[parts[i]]) {
								Vue.set(tmp, parts[i], {});
							}
							tmp = tmp[parts[i]];
						}
						Vue.set(tmp, parts[parts.length - 1], self.$services.page.getBindingValue(pageInstance, self.cell.bindings[name]));
					}
				});
				return transformed;
			},
			changed: function() {
				if (this.cell.state.immediate) {
					this.doIt();
				}
				// update local state to reflect the change
				Vue.set(this.localState, "form", this.createResult());
			},
			doIt: function() {
				var self = this;
				if (!this.doingIt) {
					var date = new Date();
					var stop = function(error) {
						self.$services.analysis.push({
							pageName: self.page.content.name,
							pageCategory: self.page.content.category,
							category: "form",
							type: "form-finalize",
							group: self.analysisId,
							event: self.analysisId + (error ? "-fail" : "-submit")
						});
						// DEPRECATED
						if (self.$services.analysis && self.$services.analysis.emit) {
							self.$services.analysis.emit(error ? "form-fail" : "form-finalize", self.analysisId, 
								{submitTime: new Date().getTime() - date.getTime(), totalTime: new Date().getTime() - self.started.getTime(), error: error}, true);
						}
					};
					this.doingIt = true;
					// if we have an embedded form with immediate turned on, don't valide it?
					var messages = this.cell.state.immediate && this.cell.target == "page" ? [] : this.$refs.form.validate();
					if (!messages.length) {
						this.messages.splice(0, this.messages.length);
						// commit the form
						// refresh things that are necessary
						// send out event! > can use this to refresh stuff!
						// globale parameters that we can pass along
						var self = this;
						var result = this.createResult();
						
						if (self.cell.state.submitEvent) {
							var pageInstance = self.$services.page.getPageInstance(self.page, self);
							// if we have a 204 return, we get null back, we don't want to emit null however
							pageInstance.emit(self.cell.state.submitEvent, result);
						}
						
						//console.log("result is", JSON.stringify(result, null, 2));
						if (this.cell.state.pageForm) {
							// close before the page is updated
							if (self.cell.state.autoclose == null || self.cell.state.autoclose) {
								self.$emit("close");
							}
							var pageInstance = self.$services.page.getPageInstance(self.page, self);
							var parameters = this.$services.page.getPageParameters(self.page);
							Object.keys(result).forEach(function(x) {
								// we have both the object-based notation and the . separated notation in the result
								// in this case, for correct merging, we want to use the . separated, never the object in its entirety
								if (result[x] == null || (result != null && (Object(result[x]) !== result[x] || result[x] instanceof Date || result[x] instanceof File))) {
									// only set if changed, otherwise we might overwrite external changes to the page state
									if (self.hasChanged(x, result[x])) {
										pageInstance.set("page." + x, result[x]);
									}
								}
							});
							if (self.cell.state.event) {
								pageInstance.emit(self.cell.state.event, self.cell.on ? pageInstance.get(self.cell.on) : {});
							}
							// if we allow read only, revert to it after a successful edit
							if (self.cell.state.allowReadOnly) {
								self.readOnly = true;
							}
							self.doingIt = false;
							// don't update the reference without updating the result!!
							// update reference value for accurate checks next time around
							self.initializePageForm();
						}
						else if (this.cell.state.functionForm) {
							var promise = this.$services.q.defer();
							var returnValue = this.$services.page.runFunction(this.cell.state.functionId, result, this, promise);
							promise.then(function(result) {
								if (self.cell.state.event) {
									var pageInstance = self.$services.page.getPageInstance(self.page, self);
									pageInstance.emit(self.cell.state.event, result == null ? returnValue : result);
								}
								if (self.cell.state.autoclose == null || self.cell.state.autoclose) {
									self.$emit("close");
								}
								// if we allow read only, revert to it after a successful edit
								if (self.cell.state.allowReadOnly) {
									self.readOnly = true;
								}
								self.doingIt = false;
								stop();
							}, function(error) {
								self.error = "Form submission failed";
								// if we get an XMLHTTPResponse thingy, parse it
								if (error && error.responseText) {
									error = JSON.parse(error.responseText);
								}
								// we get a (hopefully) standardized event back from the function
								if (error) {
									if (!error.code) {
										error.code = "HTTP-" + (error.status != null ? error.status : 500);
									}
									try {
										if (self.cell.state.errorEvent) {
											if (!self.cell.state.errorEventCodes || self.cell.state.errorEventCodes.split(/[\\s]*,[\\s]*/).indexOf(error.code) >= 0) {
												var pageInstance = self.$services.page.getPageInstance(self.page, self);
												pageInstance.emit(self.cell.state.errorEvent, error);
											}
										}
										var translated = self.$services.page.translateErrorCode(error.code, error.title ? error.title : error.message);
										self.error = translated;
										self.messages.push({
											type: "request",
											severity: "error",
											title: translated
										})
									}
									catch (exception) {
										self.messages.push({
											type: "request",
											severity: "error",
											title: self.$services.page.translateErrorCode(error.status ? "HTTP-" + error.status : "HTTP-500")
										})
									}
								}
								else {
									self.messages.push({
										type: "request",
										severity: "error",
										title: self.$services.page.translateErrorCode("HTTP-500")
									});
								}
								self.doingIt = false;
								stop(self.error);
							})
						}
						else if (this.cell.state.operation) {
							try {
								this.$services.swagger.execute(this.cell.state.operation, result).then(function(returnValue) {
									var pageInstance = self.$services.page.getPageInstance(self.page, self);
									// if we want to synchronize the values, do so
									if (self.cell.state.synchronize) {
										Object.keys(self.cell.bindings).map(function(name) {
											// only set it if we actually bound something to it
											if (self.cell.bindings[name] != null) {
												var newValue = self.result[name];
												var valueSet = false;
												// if we are setting an array, check if the original value was an array as well
												if (newValue instanceof Array) {
													var originalValue = pageInstance.get(self.cell.bindings[name]);
													if (originalValue instanceof Array) {
														originalValue.splice(0);
														nabu.utils.arrays.merge(originalValue, newValue);
														valueSet = true;
													}
												}
												if (!valueSet) {
													pageInstance.set(self.cell.bindings[name], newValue);
												}
											}
										});
									}
									if (self.cell.state.event) {
										// if we have a 204 return, we get null back, we don't want to emit null however
										var emitValue = returnValue == null ? result : returnValue;
										pageInstance.emit(self.cell.state.event, emitValue == null ? {} : emitValue);
									}
									if (self.cell.state.autoclose == null || self.cell.state.autoclose) {
										self.$emit("close");
									}
									// if we allow read only, revert to it after a successful edit
									if (self.cell.state.allowReadOnly) {
										self.readOnly = true;
									}
									self.doingIt = false;
									stop();
								}, function(error) {
									self.error = "Form submission failed";
									try {
										if (error.responseText) {
											error = JSON.parse(error.responseText);
										}
										if (self.cell.state.errorEvent) {
											if (!self.cell.state.errorEventCodes || self.cell.state.errorEventCodes.split(/[\\s]*,[\\s]*/).indexOf(error.code) >= 0) {
												var pageInstance = self.$services.page.getPageInstance(self.page, self);
												pageInstance.emit(self.cell.state.errorEvent, error);
											}
										}
										var translated = self.$services.page.translateErrorCode(error.code, error.title ? error.title : error.message);
										self.error = translated;
										self.messages.push({
											type: "request",
											severity: "error",
											title: translated
										})
									}
									catch (exception) {
										self.messages.push({
											type: "request",
											severity: "error",
											title: self.$services.page.translateErrorCode(error.status ? "HTTP-" + error.status : "HTTP-500")
										})
									}
									self.doingIt = false;
									stop(self.error);
								});
							}
							catch(exception) {
								self.doingIt = false;
								console.error("Could not submit form", exception);
								stop(exception.message);
							}
						}
						else {
							var pageInstance = self.$services.page.getPageInstance(self.page, self);
							if (self.cell.state.event) {
								pageInstance.emit(self.cell.state.event, {});
							}
							if (self.cell.state.autoclose == null || self.cell.state.autoclose) {
								self.$emit("close");
							}
							// if we allow read only, revert to it after a successful edit
							if (self.cell.state.allowReadOnly) {
								self.readOnly = true;
							}
							self.doingIt = false;
							stop();
						}
					}
					else {
						self.doingIt = false;
						this.scrollToException(messages);
					}
				}
			},
			up: function(field) {
				var index = this.cell.state.fields.indexOf(field);
				if (index > 0) {
					var replacement = this.cell.state.fields[index - 1];
					this.cell.state.fields.splice(index - 1, 1, this.cell.state.fields[index]);
					this.cell.state.fields.splice(index, 1, replacement);
				}
			},
			down: function(field) {
				var index = this.cell.state.fields.indexOf(field);
				if (index < this.cell.state.fields.length - 1) {
					var replacement = this.cell.state.fields[index + 1];
					this.cell.state.fields.splice(index + 1, 1, this.cell.state.fields[index]);
					this.cell.state.fields.splice(index, 1, replacement);
				}
			},
			upAll: function(field) {
				var index = this.cell.state.fields.indexOf(field);
				if (index > 0) {
					this.cell.state.fields.splice(index, 1);
					this.cell.state.fields.unshift(field);
				}
			},
			downAll: function(field) {
				var index = this.cell.state.fields.indexOf(field);
				if (index < this.cell.state.fields.length - 1) {
					this.cell.state.fields.splice(index, 1);
					this.cell.state.fields.push(field);
				}
			}
		},
		watch: {
			// if we switch out of read only mode, check autofocus
			readOnly: function(newValue) {
				this.$root.$emit(newValue ? "form-closed" : "form-opened", this);
				if (!newValue && this.cell.state.autofocus) {
					var self = this;
					Vue.nextTick(function() {
						self.$refs.form.$el.querySelector("input").focus();
					});
				}
			}
		}
	});
}

nabu.page.formComponentConstructer("page-form");
nabu.page.formComponentConstructer("page-form-configure-all");

Vue.component("page-form-field", {
	template: "#page-form-field",
	props: {
		page: {
			type: Object,
			required: false
		},
		cell: {
			type: Object,
			required: false,
		},
		schema: {
			type: Object,
			required: false
		},
		field: {
			type: Object,
			required: true
		},
		value: {
			required: true
		},
		label: {
			type: Boolean,
			required: false,
			default: true
		},
		timeout: {
			type: Number,
			required: false,
			default: 600
		},
		isDisabled: {
			type: Boolean,
			required: false,
			default: false
		},
		// the parent value that contains the value
		parentValue: {
			required: false
		},
		readOnly: {
			type: Boolean,
			required: false
		},
		schemaResolver: {
			type: Function,
			required: false
		},
		validateTimeout: {
			required: false
		},
		codes: {
			required: false
		},
		validateOnBlur: {
			required: false
		}
	},
	created: function() {
		// if it is a fixed field, just emit the value
		if (this.field.fixed) {
			this.$emit("input", this.field.value);
		}
		
		if (this.field.listeners && this.field.listeners.length > 0) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			this.field.listeners.forEach(function(x) {
				console.log("subscribing", x);
				self.subscriptions.push(pageInstance.subscribe(x.to.replace(/^([^.]+).*/, "$1"), function(value) {
					// this was initially added to fill in filter fields in a data component
					// for some reason, this bit was triggered with the correct value but then immediately retriggered with the incorrect value
					// perhaps the event is triggering a load which in turn triggers an unset of some sort?
					// it is not entirely clear but for the current purposes, it is enough to ignore null values
					// perhaps in the future, if we want to unset values with a remote event (not sure how that would go though?) we could try to dig deeper
					// perhaps a "reset" listener is better suited, as emitting null is not ideal anyway
					var result = value ? self.$services.page.getValue(value, x.to.replace(/^[^.]+[.](.*)/, "$1")) : null;
					// it seems to immediately trigger to null?
					if (result != null) {
						self.$emit("input", result);
					}
				}));
			});
		}
	},
	// mostly a copy paste from form-section
	data: function() {
		return {
			labels: [],
			subscriptions: []
		}
	},
	computed: {
		definition: function() {
			return nabu.utils.vue.form.definition(this);
		},
		mandatory: function() {
			return nabu.utils.vue.form.mandatory(this);
		},
		fieldLabel: function() {
			if (!this.label) {
				return null;
			}
			return this.field.label ? this.field.label : null;
		}
	},
	methods: {
		blur: function() {
			if (this.validateOnBlur) {
				this.validate();
			}
		},
		slowValidate: function() {
			if (this.validateTimer != null) {
				clearTimeout(this.validateTimer);
				this.validateTimer = null;
			}
			if (this.validateTimeout) {
				this.validateTimer = setTimeout(this.validate, this.validateTimeout);
			}
		},
		usesMultipleFields: function(type) {
			var provided = nabu.page.providers("page-form-input").filter(function(x) {
				 return x.name == type;
			})[0];
			return provided ? provided.multipleFields : false;
		},
		getProvidedComponent: function(type) {
			var provided = nabu.page.providers("page-form-input").filter(function(x) {
				 return x.name == type;
			})[0];
			return provided ? provided.component : null;	
		},
		fieldClasses: function(field) {
			if (field.styles) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				return this.$services.page.getDynamicClasses(field.styles, this.state, this);
			}
			return [];
		},
		validate: function(soft) {
			var messages = nabu.utils.vue.form.validateChildren(this, soft);
			if (this.validator) {
				var additional = this.validator(this.value);
				if (additional && additional.length) {
					for (var i = 0; i < additional.length; i++) {
						additional[i].component = this;
						if (typeof(additional[i].context) == "undefined") {
							additional[i].context = [];
						}
						messages.push(additional[i]);
					}
				}
			}
			if (messages.then) {
				messages.then(this.emitSuccess);
			}
			else {
				this.emitSuccess(messages);
			}
			return messages;
		},
		emitSuccess: function(messages) {
			if (messages && !messages.length) {
				var event = nabu.page.event.getName(this.field, "validationSuccessEvent");
				if (event) {
					var pageInstance = this.$services.page.getPageInstance(this.page, this);
					var content = nabu.page.event.getInstance(this.field, "validationSuccessEvent", this.page, this);
					pageInstance.emit(event, content == null ? {} : content);
				}
			}
		}
	},
	events: {
		'$vue.child.added': function(child) {
			if (child.label) {
				// we pass in the entire component because we are interested in the "hide" property it may have
				// if we simply pass in the hide, it doesn't work...
				this.labels.push({ 
					name: child.label,
					component: child
				});
			}
			else if (!this.labels.length && child.labels) {
				nabu.utils.arrays.merge(this.labels, child.labels);
			}
			else {
				this.labels.push(null);
			}
		}
	}
});

Vue.component("page-form-configure", {
	template: "#page-form-configure",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		title: {
			type: String,
			required: true
		},
		// string list of field names
		possibleFields: {
			type: Array,
			required: true
		},
		// field values
		fields: {
			type: Array,
			required: true
		},
		isList: {
			type: Function,
			required: false
		},
		editName: {
			type: Boolean,
			required: false
		},
		groupable: {
			type: Boolean,
			required: false,
			default: false
		},
		schemaResolver: {
			type: Function,
			required: false,
			default: function(name) { return null }
		},
		allowReadOnly: {
			type: Boolean,
			required: false
		},
		rootTag: {
			type: String,
			required: false,
			default: "n-collapsible"
		},
		dark: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	methods: {
		up: function(field) {
			var index = this.fields.indexOf(field);
			if (index > 0) {
				var replacement = this.fields[index - 1];
				this.fields.splice(index - 1, 1, this.fields[index]);
				this.fields.splice(index, 1, replacement);
			}
		},
		down: function(field) {
			var index = this.fields.indexOf(field);
			if (index < this.fields.length - 1) {
				var replacement = this.fields[index + 1];
				this.fields.splice(index + 1, 1, this.fields[index]);
				this.fields.splice(index, 1, replacement);
			}
		},
		upAll: function(field) {
			var index = this.fields.indexOf(field);
			if (index > 0) {
				this.fields.splice(index, 1);
				this.fields.unshift(field);
			}
		},
		downAll: function(field) {
			var index = this.fields.indexOf(field);
			if (index < this.fields.length - 1) {
				this.fields.splice(index, 1, replacement);
				this.fields.push(field);
			}
		},
		addField: function(content) {
			if (content) {
				this.fields.push({
					arbitrary: true,
					route: null,
					bindings: {}
				});
			}
			else {
				this.fields.push({
					arbitrary: false,
					name: null,
					label: null,
					description: null,
					type: null,
					enumerations: [],
					value: null,
					group: null,
					joinGroup: false
				});
			}
		}
	}
});

Vue.component("page-form-configure-single", {
	template: "#page-form-configure-single",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		},
		possibleFields: {
			type: Array,
			required: true
		},
		allowLabel: {
			type: Boolean,
			required: false,
			default: true
		},
		allowDescription: {
			type: Boolean,
			required: false,
			default: true
		},
		isList: {
			type: Function,
			required: false
		},
		groupable: {
			type: Boolean,
			required: false,
			default: false
		},
		hidable: {
			type: Boolean,
			required: false,
			default: false
		},
		schema: {
			type: Object,
			required: false
		},
		allowReadOnly: {
			type: Boolean,
			required: false
		}
	},
	created: function() {
		this.normalize(this.field);
	},
	computed: {
		types: function() {
			var provided = [];
			if (this.isList && this.isList(this.field.name)) {
				nabu.utils.arrays.merge(provided, nabu.page.providers("page-form-list-input").map(function(x) { return x.name }));
			}
			else {
				provided.push("fixed");
				nabu.utils.arrays.merge(provided, nabu.page.providers("page-form-input").map(function(x) { return x.name }));
			}
			provided.sort();
			return provided;
		}
	},
	methods: {
		filterFieldNames: function(value) {
 			var names = this.possibleFields.filter(function(x) {
 				return (!value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0);
 			});
 			return names;
 		},
		filterTypes: function (value) {
			var types = this.types.filter(function(x) {
				return (!value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
			return types;	
		},	
		usesMultipleFields: function(type) {
			var provided = nabu.page.providers("page-form-input").filter(function(x) {
				 return x.name == type;
			})[0];
			return provided ? provided.multipleFields : false;
		},
		getProvidedConfiguration: function(type) {
			var provided = nabu.page.providers(this.isList && this.isList(this.field.name) ? "page-form-list-input" : "page-form-input").filter(function(x) {
				 return x.name == type;
			})[0];
			return provided ? provided.configure : null;
		},
		normalize: function(field) {
			if (!field.hasOwnProperty("name")) {
				Vue.set(field, "name", null);
			}
			if (!field.hasOwnProperty("label")) {
				Vue.set(field, "label", null);
			}
			if (!field.hasOwnProperty("description")) {
				Vue.set(field, "description", null);
			}
			if (!field.hasOwnProperty("type")) {
				Vue.set(field, "type", null);
			}
			if (!(field.enumerations instanceof Array)) {
				Vue.set(field, "enumerations", []);
			}
			if (!field.hasOwnProperty("value")) {
				Vue.set(field, "value", null);
			}
		}
	}
});

Vue.component("page-configure-arbitrary", {
	template: "#page-configure-arbitrary",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		target: {
			type: Object,
			required: true
		},
		keys: {
			type: Array,
			required: false,
			default: function() { return [] }
		}
	},
	created: function() {
		if (this.target.bindings == null) {
			this.target.bindings = {}
		}
	},
	computed: {
		availableParameters: function() {
			var available = this.$services.page.getAvailableParameters(this.page, this.cell, true);
			if (this.keys.length) {
				available.record = {properties:{}};
				this.keys.forEach(function(key) {
					available.record.properties[key] = {
						type: "string"
					}
				});
			}
			return available;
		}
	},
	methods: {
		getTargetParameters: function(target) {
			var parameters = this.$services.page.getRouteParameters(this.$services.router.get(target.route));
			if (parameters.properties) {
				// these are auto-injected
				delete parameters.properties.cell;
				delete parameters.properties.page;
				delete parameters.properties.edit;
				delete parameters.properties.component;
			}
			return parameters;
		},
		filterRoutes: function(value) {
			var routes = this.$services.router.list().filter(function(x) {
				return x.alias && (!value || x.alias.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
			routes.sort(function(a, b) {
				return a.alias.localeCompare(b.alias);
			});
			return routes.map(function(x) { return x.alias });
		},
	}
});

Vue.component("page-arbitrary", {
	template: "#page-arbitrary",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		target: {
			type: Object,
			required: true
		},
		// the component that owns this arbitrary content
		component: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: false
		},
		record: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			instance: null
		}
	},
	methods: {
		handle: function() {
				
		},
		getParameters: function() {
			var cellClone = nabu.utils.objects.clone(this.cell);
			cellClone.state = this.target;
			var parameters = {
				page: this.page,
				cell: cellClone,
				component: this.component,
				edit: this.edit
			};
			if (this.target.bindings) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				Object.keys(this.target.bindings).forEach(function(key) {
					if (self.target.bindings[key]) {
						if (self.target.bindings[key].indexOf("record.") == 0) {
							var value = self.record ? self.$services.page.getValue(self.record, self.target.bindings[key].substring("record.".length)) : null;
							if (value != null) {
								parameters[key] = value;
							}
						}
						else {
							parameters[key] = self.$services.page.getBindingValue(pageInstance, self.target.bindings[key]);
						}
					}
				});
			}
			return parameters;
		},
		mounted: function(instance) {
			this.instance = instance;
			if (this.instance.getEvents) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				pageInstance.resetEvents();
			}
		},
		validate: function(soft) {
			if (this.instance && this.instance.validate) {
				return this.instance.validate(soft);
			}
		}
	}
});