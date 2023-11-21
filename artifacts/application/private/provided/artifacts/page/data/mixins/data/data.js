if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }
if (!nabu.page.views.data) { nabu.page.views.data = {} }

// this is a helper component, we want to combine a mixin (datacommon) with reusable templates
// unfortunately that is pretty hard to do in vue
// the reusable templates must have the correct methods in some way, shape or form, this currently means they also use the mixin
// that means, we have in general 3 instances of the data common: the core component (e.g. table), the data header and the data footer
// we "solve" this (badly) by passing in a lot of state from the outside so the footer and header work on the same dataset even though they have different instances
// we then encapsulate this in a separate component (this one) so all that binding is done centrally
// again, we are looking for a better alternative, but this approach should be forwards-compatible and hides the bad solution
Vue.component("data-common-content", {
	template: "#data-common-content",
	props: {
		data: {
			type: Object
		}
	},
	beforeDestroy: function() {
		this.data.$destroy();
	}
})

// because we split up the header, footer and they all extend common
// the first load() is triggered by the main body
// however any loads triggered through searching come from the header!
// could really use a refactor...

// a section is a logical subdivision of a component
// for instance a calendar might have a section "day", that day might not have actual data (records) attached to it, but it is a visual section that has a meaning
// you can for instance attach events to particular sections

// pluggable functions
// - getCustomEvents: add your own events
// - getDropDefinition: add a definition for the drop target data available (so when you drop on a particular zone, which information will be available?)
// - getSectionDefinition: when a section emits an event, what is the data it will be emitting?
nabu.page.views.data.DataCommon = Vue.extend({ 
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
		},
		records: {
			type: Array,
			required: false,
			default: function() { return [] }
		},
		allRecords: {
			type: Array,
			required: false,
			default: function() { return [] }
		},
		selected: {
			type: Array,
			required: false,
			default: function() { return [] }
		},
		updatable: {
			type: Boolean,
			required: false,
			default: false
		},
		multiselect: {
			type: Boolean,
			required: false,
			default: false
		},
		inactive: {
			type: Boolean,
			required: false,
			default: false
		},
		showEmpty: {
			type: Boolean,
			required: false,
			default: false
		},
		paging: {
			type: Object,
			required: false,
			default: function() { return {} }
		},
		filters: {
			type: Object,
			required: false,
			default: function() { return {} }
		},
		supportsRecordStyling: {
			type: Boolean,
			required: false,
			default: true
		},
		supportsGlobalStyling: {
			type: Boolean,
			required: false,
			default: false
		},
		supportsFields: {
			type: Boolean,
			required: false,
			default: true
		},
		supportsDetailFields: {
			type: Boolean,
			required: false,
			default: false
		},
		dynamicArray: {
			type: Array,
			required: false,
			default: function() {
				return [];
			}
		}
	},
	data: function() {
		return {
			filterState: null,
			actionHovering: false,
			last: null,
			showFilter: false,
			ready: false,
			subscriptions: [],
			streamSubscriptions: [],
			lastTriggered: null,
			query: null,
			// the current order by
			orderBy: [],
			refreshTimer: null,
			loadTimer: null,
			lazyPromise: null,
			wizard: "step1",
			offset: 0,
			// a dynamic limit set by the user
			dynamicLimit: null,
			// doing certain actions (like drag drop) you may want to halt refreshing
			blockRefresh: false,
			// keep track when the update is working
			updating: false,
			// if we get a call back after destroy, we don't want to start reloading etc
			destroyed: false
		}
	},
	ready: function() {
		this.ready = true;
		if (this.cell.state.array || this.inactive) {
			//this.$emit("input", true);
		}
	},
	watch: {
		watchedArray: function(newValue) {
			//this.allRecords.splice(0);
			//if (newValue) {
			//	nabu.utils.arrays.merge(this.allRecords, newValue);
			//}
			
			// if we don't splice it, we get _very_ strange behavior
			this.allRecords.splice(0);
			this.load(this.paging && this.paging.current ? this.paging.current : 0, false);
		},
		records: function(newValue) {
			if (this.cell.state.recordsUpdatedEvent) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				pageInstance.emit(this.cell.state.recordsUpdatedEvent, this.records);
			}
		}
	},
	computed: {
		selectable: function() {
			// selected events must not be linked to fields
			return this.cell.state.actions.filter(this.isSelectionAction).length > 0;
		},
		hasStreamCreate: function() {
			var operation = this.operation;
			console.log("operation is", operation);
			return operation && operation["x-stream-create"];
		},
		hasStreamUpdate: function() {
			var operation = this.operation;
			return operation && operation["x-stream-update"];
		},
		allSelected: function() {
			// double should not be selected...otherwise we need to check deeper
			return this.records.length == this.selected.length;	
		},
		filterConfiguration: function() {
			var self = this;
			if (this.cell.state.filterType) {
				// backwards compatibility
				if (this.cell.state.filterType.configure) {
					return this.cell.state.filterType.configure;
				}
				else {
					var filter = nabu.page.providers('data-filter').filter(function(x) {
						return x.component == self.cell.state.filterType;
					})[0];
					return filter && filter.configure ? filter.configure : null;
				}
			}	
		},
		eventFields: function() {
			return this.cell.state.fields.map(function(x, index) {
				return {
					index: index,
					label: x.label
				}
			});
		},
		watchedArray: function() {
			if (this.cell.state.array) {
				var current = this.$services.page.getValue(this.localState, this.cell.state.array);
				if (current == null) {
					current = this.$services.page.getPageInstance(this.page, this).get(this.cell.state.array);
				}
				return current;
			}
			return [];
		},
		self: function() {
			return this;
		},
		filterable: function() {
			return this.cell.state.filters.length;  
		},
		actions: function() {
			return this.cell.state.actions.filter(function(x) {
				return !x.global && (x.label || x.icon);
			});
		},
		recordActions: function() {
			return this.actions.filter(function(x) {
				return !x.global && !x.section && x.field == null;
			});
		},
		globalActions: function() {
			var self = this;
			var globalActions = this.cell.state.actions.filter(function(x) {
				if (!x.global) {
					return false;
				}
				return !x.condition || self.$services.page.isCondition(x.condition, {records:self.records}, self);
			});
			return globalActions;
		},
		dataClass: function() {
			return this.cell.state.class ? this.cell.state.class : [];        
		},
		operation: function() {
			return this.cell.state.operation ? this.$services.swagger.operations[this.cell.state.operation] : null;
		},
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, this.cell, true);
		},
		definition: function() {
			var properties = {};
			if (this.operation && this.operation.responses["200"]) {
				var definition = this.$services.swagger.resolve(this.operation.responses["200"].schema);
				var arrays = this.$services.page.getArrays(definition);
				if (arrays.length > 0) {
					var childDefinition = this.$services.page.getChildDefinition(definition, arrays[0]);
					if (childDefinition && childDefinition.items && childDefinition.items.properties) {
						nabu.utils.objects.merge(properties, childDefinition.items.properties);
					}
				}
				if (definition.properties) {
					var self = this;
					Object.keys(definition.properties).map(function(field) {
						if (definition.properties[field].type == "array") {
							var items = definition.properties[field].items;
							if (items.properties) {
								nabu.utils.objects.merge(properties, items.properties);
							}
						}
					});
				}
			}
			else if (this.cell.state.array) {
				var available = this.$services.page.getAvailableParameters(this.page, this.cell, true);
				var indexOfDot = this.cell.state.array.indexOf(".");
				var variable = indexOfDot < 0 ? this.cell.state.array : this.cell.state.array.substring(0, indexOfDot);
				var rest = indexOfDot < 0 ? null : this.cell.state.array.substring(indexOfDot + 1);
				if (available[variable]) {
					// we can have root arrays rather than part of something else
					// for example from a multiselect event
					if (!rest) {
						if (available[variable].items && available[variable].items.properties) {
							nabu.utils.objects.merge(properties, available[variable].items.properties);
						}
					}
					else {
						var childDefinition = this.$services.page.getChildDefinition(available[variable], rest);
						if (childDefinition) {
							nabu.utils.objects.merge(properties, childDefinition.items.properties);
						}
					}
				}
			}
			else if (this.cell.state.dynamicArrayType) {
				var schema = this.$services.swagger.swagger.definitions[this.cell.state.dynamicArrayType];
				if (schema && schema.properties) {
					nabu.utils.objects.merge(properties, schema.properties);
				}
			}
			return properties;
		},
		hasLimit: function() {
			var self = this;
			return !this.operation || (!this.operation.parameters ? false : this.operation.parameters.filter(function(x) {
				return self.getFinalName(x.name) == "limit";
			}).length);
		},
		// all the actual parameters (apart from the spec-based ones)
		inputParameters: function() {
			var result = {
				properties: {}
			};
			var self = this;
			if (this.operation && this.operation.parameters) {
				var blacklist = ["limit", "offset", "orderBy", "connectionId"];
				var parameters = this.operation.parameters.filter(function(x) {
					return blacklist.indexOf(self.getFinalName(x)) < 0;
				}).map(function(x) {
					result.properties[x.name] = self.$services.swagger.resolve(x);
				})
			}
			return result;
		},
		formInputParameters: function() {
			var result = {
				properties: {}
			};
			if (this.cell.state.updateOperation && this.$services.swagger.operations[this.cell.state.updateOperation]) {
				this.$services.swagger.operations[this.cell.state.updateOperation].parameters.filter(function(x) {
					return x.in != "body";
				}).map(function(parameter) {
					result.properties[parameter.name] = parameter;
				});
			}
			return result;
		},
		formAvailableParameters: function() {
			var result = this.$services.page.getAvailableParameters(this.page, this.cell, true);
			result.record = {
				properties: this.definition
			};
			return result;
		},
		keys: function() {
			var keys = this.$services.page.getSimpleKeysFor({properties:this.definition}, true, true);
			var self = this;
			keys.map(function(key) {
				if (!self.cell.state.result[key]) {
					Vue.set(self.cell.state.result, key, {
						label: null,
						format: null,
						custom: null,
						styles: []
					});
				}
			});
			return keys;
		},
		simpleKeys: function() {
			var keys = this.$services.page.getSimpleKeysFor({properties:this.definition}, false, false);
			var self = this;
			keys.map(function(key) {
				if (!self.cell.state.result[key]) {
					Vue.set(self.cell.state.result, key, {
						label: null,
						format: null,
						custom: null,
						styles: []
					});
				}
			});
			return keys;
		},
		orderable: function() {
			var self = this;
			// the operation must have an input parameter called "orderBy"
			return this.operation && this.operation.parameters.filter(function(x) {
				return self.getFinalName(x.name) == "orderBy";
			}).length > 0;
		},
		pageable: function() {
			var self = this;
			// the operation must have an input parameter called "orderBy"
			return this.operation && this.operation.parameters.filter(function(x) {
				return self.getFinalName(x.name) == "limit";
			}).length > 0;
		}
	},
	beforeDestroy: function() {
		var self = this;
		this.destroyed = true;
		this.subscriptions.map(function(x) {
			x();
		});
		this.streamSubscriptions.forEach(function(x) {
			x();
		});
		console.log("destroying data!", this.refreshTimer, this.cell.state.operation, this);
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}	
	},
	methods: {
		// get all the events that apply to a certain section
		getSectionActions: function(section) {
			return this.actions.filter(function(x) {
				return x.section == section;
			});
		},
		onDragStart: function(event, record) {
			var name = this.cell.state.dragName ? this.cell.state.dragName : "default";
			this.$services.page.setDragData(event, "data-" + name, JSON.stringify(record));
		},
		onDragOver: function(event, record) {
			if (this.cell.state.enableDrop) {
				var dropName = this.cell.state.dropName ? this.cell.state.dropName : "default";
				var data = this.$services.page.getDragData(event, "data-" + dropName);
				// TODO: add support for further conditions to be evaluated
				if (data) {
					event.preventDefault();
				}
			}
		},
		onDrop: function(event, record) {
			console.log("dropping", event, record);
			var self = this;
			if (this.cell.state.enableDrop && this.cell.state.dropEventName) {
				var eventName = this.cell.state.dropEventName;
				var dropName = this.cell.state.dropName ? this.cell.state.dropName : "default";
				var data = this.$services.page.getDragData(event, "data-" + dropName);
				
				if (data) {
					var pageInstance = self.$services.page.getPageInstance(self.page, self);
					pageInstance.emit(eventName, {
						source: JSON.parse(data),
						target: record
					});
				}
			}
		},
		getDraggables: function() {
			var result = {};
			if (this.cell.state.enableDrag) {
				var name = this.cell.state.dragName ? this.cell.state.dragName : "default";
				result[name] = this.definition;
			}
			return result;
		},
		// TODO: allow the user to choose their own key in the record
		getKey: function(record) {
			if (record && record.id) {
				return record.id;
			}
			// sometimes we have arrays of uuids
			else if (record && typeof(record) == "string") {
				return record;
			}
			else if (record && record.hasOwnProperty("$position")) {
				return record["$position"];
			}
			else {
				return this.records.indexOf(record);
			}
		},
		// allows to load selected items
		loadSelected: function(selected) {
			if (selected instanceof Array) {
				selected.forEach(this.loadSelected);
			}
			else if (selected) {
				var self = this;
				this.records.forEach(function(record) {
					// if we have an "id" field, we will try to match on this
					if (selected.id && selected.id == record.id) {
						self.selected.push(record);
					}
					else if (!selected.id && JSON.stringify(selected) == JSON.stringify(record)) {
						self.selected.push(record);
					}
				});
			}
		},
		getLimitName: function() {
			var self = this;
			var limit = !this.operation || !this.operation.parameters ? null : this.operation.parameters.filter(function(x) {
				return self.getFinalName(x.name) == "limit";
			})[0];
			return limit == null ? null : limit.name;
		},
		getOffsetName: function() {
			var self = this;
			var limit = !this.operation || !this.operation.parameters ? null : this.operation.parameters.filter(function(x) {
				return self.getFinalName(x.name) == "offset";
			})[0];
			return limit == null ? null : limit.name;
		},
		getOrderByName: function() {
			var self = this;
			var limit = !this.operation || !this.operation.parameters ? null : this.operation.parameters.filter(function(x) {
				return self.getFinalName(x.name) == "orderBy";
			})[0];
			return limit == null ? null : limit.name;
		},
		// when we directly drag a swagger service into an application, the limit is actually under parameters
		// so it becomes "parameter:limit".
		getFinalName: function(param) {
			// if we give the whole document, we just want the name
			if (param && param.name) {
				param = param.name;
			}
			if (!param) {
				return null;
			}
			var parts = param.split(":");
			return parts[parts.length - 1];
		},
		fieldActions: function(field, record) {
			var index = this.cell.state.fields.indexOf(field);
			var self = this;
			return this.cell.state.actions.filter(function(x) {
				return x.field === index;
			}).map(function(x) {
				if (!x.label || x.label.indexOf("=") != 0) {
					return x;
				}
				var clone = JSON.parse(JSON.stringify(x));
				clone.label = self.$services.page.interpret(clone.label, self, {record:record});
				return clone;
			});
		},
		generateStub: function() {
			var definition = this.definition;
			if (definition) {
				var self = this;
				for (var i = 0; i < 10; i++) {
					var stub = {};
					Object.keys(definition).forEach(function(key) {
						var value = null;
						if (definition[key].format == "date-time" || definition[key].format == "date") {
							value = new Date();
						}
						else if (definition[key].type == "boolean") {
							value = true;
						}
						else {
							value = "test";
						}
						self.$services.page.setValue(stub, key, value);
					});
					this.records.push(stub);
				}
			}
		},
		getOrderByKeys: function(value) {
			var keys = this.$services.page.getSimpleKeysFor({properties:this.definition});
			if (value && keys.indexOf(value) < 0) {
				keys.unshift(value);
			}
			return keys;
		},
		addDownloadListener: function() {
			if (!this.cell.state.downloadOn) {
				Vue.set(this.cell.state, "downloadOn", []);
			}
			this.cell.state.downloadOn.push({
				event: null,
				contentType: null,
				limit: null,
				fileName: null
			});
		},
		getContentTypes: function() {
			return [{
				type: "xml",
				contentType: "application/xml"
			}, {
				type: "json",
				contentType: "application/json"
			}, {
				type: "csv",
				contentType: "text/csv"
			}, {
				type: "xlsx",
				contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
			}]
		},
		isFieldHidden: function(field, record) {
			return !!field.hidden && this.$services.page.isCondition(field.hidden, {record:record}, this);
		},
		isAllFieldHidden: function(field) {
			if (!field.hidden) {
				return false;
			}
			for (var i = 0; i < this.records.length; i++) {
				if (!this.isFieldHidden(field, this.records[i])) {
					return false;
				}
			}
			return true;
		},
		create: function() {
			this.normalize(this.cell.state);
			// merge the configured orderby into the actual
			nabu.utils.arrays.merge(this.orderBy, this.cell.state.orderBy);
		},
		activate: function(done) {
			if (!this.inactive) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				
				// prefill filter value if necessary
				if (this.cell.state.filters && this.filters) {
					this.cell.state.filters.forEach(function(filter) {
						if (self.cell.bindings[filter.name]) {
							self.filters[filter.name] = self.$services.page.getBindingValue(pageInstance, self.cell.bindings[filter.name], self);
						}
					});
				}
				
				if (this.cell.state.array) {
					this.loadArray();
					done();
				}
				else {
					var self = this;
					this.load().then(function() {
						done();
					}, done);
				}
				
				this.cell.state.refreshOn.forEach(function(x) {
					self.subscriptions.push(pageInstance.subscribe(x, function() {
						// mimic the frontend configuration logic
						if (self.operation != null) {
							self.load(self.paging.current);
						}
						else if (self.cell.state.array != null) {
							self.pushToArray(pageInstance.get(x));
						}
					}));
				});
				if (this.cell.state.downloadOn) {
					this.cell.state.downloadOn.forEach(function(x) {
						self.subscriptions.push(pageInstance.subscribe(x.event, function() {
							self.download(x);
						}));
					});
				}
				if (this.cell.state.updateLimitListeners) {
					this.cell.state.updateLimitListeners.forEach(function(x) {
						if (x != null) {
							var index = x.indexOf(".");
							var eventName = index >= 0 ? x.substring(0, index) : x;
							self.subscriptions.push(pageInstance.subscribe(eventName, function(a) {
								// we want a subpart of it
								if (a && index >= 0) {
									a = self.$services.page.getValue(a, x.substring(index + 1));
								}
								if (a != null) {
									a = parseInt(a);
								}
								self.dynamicLimit = a;
								self.load();
							}));
						}
					});
				}
			}
			else {
				done();
			}
		},
		addLimitUpdateListener: function() {
			if (!this.cell.state.updateLimitListeners) {
				Vue.set(this.cell.state, "updateLimitListeners", []);
			}	
			this.cell.state.updateLimitListeners.push(null);
		},
		download: function(definition) {
			var fileName = definition.fileName;
			if (!fileName) {
				var contentType = this.getContentTypes().filter(function(x) {
					return x.contentType == definition.contentType;
				})[0];
				fileName = "unnamed";
				if (contentType) {
					fileName += "." + contentType.type;
				}
			}
			var parameters = this.getRestParameters();
			if (definition.limit == 0) {
				delete parameters.limit;
			}
			else if (definition.limit != null) {
				parameters.limit = definition.limit;
			}
			parameters = this.$services.swagger.parameters(this.cell.state.operation, parameters);
			var url = parameters.url;
			if (url.indexOf("?") < 0) {
				url += "?";
			}
			else {
				url += "&";
			}
			url += "header:Accept=" + definition.contentType;
			url += "&header:Accept-Content-Disposition=attachment;filename=\"" + fileName + "\"";
			window.location = url;
		},
		getDataOperations: function(value) {
			return this.$services.dataUtils.getDataOperations(value).map(function(x) { return x.id });	
		},
		getSortKey: function(field) {
			if (field.orderField) {
				return field.orderField;
			}
			for (var i = 0; i < field.fragments.length; i++) {
				var fragment = field.fragments[i];
				if (fragment.type == "data" && fragment.key) {
					return fragment.key;
				}
				else if (fragment.type == "form" && fragment.form.name) {
					return fragment.form.name;
				}
			}
			return null;
		},
		getEvents: function() {
			var self = this;
			var result = {};
			if (this.operation) {
				if (this.operation.responses && this.operation.responses["200"]) {
					var schema = this.operation.responses["200"].schema;
					
					// the return is always a singular object
					var definition = this.$services.swagger.resolve(schema).properties;
					var found = false;
					// we are interested in the (complex) array within this object
					if (definition) {
						Object.keys(definition).map(function(key) {
							if (!found && definition[key].type == "array" && definition[key].items.properties) {
								definition = definition[key].items;
								found = true;
							}
						});
					}
					if (!found) {
						definition = null;
					}
					this.cell.state.actions.forEach(function(action) {
						if (!action.section) {
							result[action.name] = action.global && (!action.useSelection && !action.useAll)
								//? (self.cell.on ? self.$services.page.instances[self.page.name].getEvents()[self.cell.on] : [])
								? (self.cell.on ? self.cell.on : {})
								: definition;
						}
					});
				}
			}
			else {
				this.cell.state.actions.forEach(function(action) {
					if (!action.section) {
						result[action.name] = action.global && (!action.useSelection && !action.useAll) 
							? (self.cell.on ? self.cell.on : {})
							: {properties:self.definition};
					}
				});
			}
			this.cell.state.actions.forEach(function(action) {
				if (action.section) {
					result[action.name] = {properties:self.getSectionDefinition ? self.getSectionDefinition(action.section) : {}};
				}
			});
			// add the event!
			if (this.cell.state.inlineUpdateEvent) {
				result[this.cell.state.inlineUpdateEvent] = {properties:self.definition};
			}
			if (this.cell.state.recordsUpdatedEvent) {
				result[this.cell.state.recordsUpdatedEvent] = {type: "array", items: {properties: this.definition, type: "object"}};
			}
			if (this.getCustomEvents) {
				var custom = this.getCustomEvents();
				if (custom) {
					Object.keys(custom).forEach(function(key) {
						result[key] = custom[key];	
					});
				}
			}
			if (this.cell.state.enableDrop && this.cell.state.dropEventName) {
				var draggables = this.$services.page.getDraggables();
				var dropName = this.cell.state.dropName ? this.cell.state.dropName : "default"; 
				if (draggables[dropName]) {
					result[this.cell.state.dropEventName] = {
						properties: {
							"source": { type: "object", properties: draggables[dropName] },
							"target": { type: "object", properties: this.getDropDefinition ? this.getDropDefinition() : {} }	// this.definition
						}
					};
				}
			}
			return result;
		},
		buildSimpleToolTip: function(field) {
			var self = this;
			return function(data) {
				var result = data ? data[field] : null;
				if (result && Number(result) == result && result % 1 != 0) {
					result = self.$services.formatter.number(result, 2);
				}
				return result;
			}
		},
		buildToolTip: function(d, field) {
			if (!this.cell.state.fields.length) {
				return null;
			}
			var self = this;
			var component = Vue.extend({
				template: "<page-fields class='data-field' :cell='cell' :label='label' :page='page' :data='record' :should-style='true' :edit='edit'/>",
				data: function() {
					return {
						cell: self.cell,
						page: self.page,
						record: d,
						edit: self.edit,
						label: self.cell.state.showFieldLabels
					}
				}
			});
			return new component();
		},
		getRefreshEvents: function(value) {
			return this.$services.page.getPageInstance(this.page, this).getAvailableEvents();
		},
		getRecordStyles: function(record) {
			var styles = [{'selected': this.selected.indexOf(record) >= 0}];
			nabu.utils.arrays.merge(styles, this.$services.page.getDynamicClasses(this.cell.state.styles, {record:record}, this));
			return styles;
		},
		addRecordStyle: function() {
			this.cell.state.styles.push({
				class: null,
				condition: null
			});
		},
		addGlobalStyle: function() {
			if (!this.cell.state.globalStyles) {
				Vue.set(this.cell.state, "globalStyles", []);
			}
			this.cell.state.globalStyles.push({
				class: null,
				condition: null
			});
		},
		addStyle: function(key) {
			if (!this.cell.state.result[key].styles) {
				Vue.set(this.cell.state.result[key], "styles", []);
			}
			this.cell.state.result[key].styles.push({
				class:null,
				condition:null
			});
		},
		getLiveFilters: function() {
			var self = this;
			return this.cell.state.filters.map(function(x) {
				// if we have a client side filter, enrich it with the possible values
				if (x && x.name && x.name.indexOf("$client.") == 0) {
					var fieldName = x.name.substring("$client.".length);
					var clone = nabu.utils.objects.clone(x);
					clone.enumerations = self.records.map(function(y) {
						return y[fieldName];
					});
					return clone;
				}
				return x;
			});
		},
		// standard methods!
		refresh: function() {
			this.load();
		},
		// custom methods
		setFilter: function(filter, newValue) {
			Vue.set(this.filters, filter.name, newValue);
			// if we adjusted the filter, do we want to rescind the selection event we may have sent out?
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			this.cell.state.actions.map(function(action) {
				if (action.name && pageInstance.get(action.name)) {
					pageInstance.emit(action.name, null, true);
				}
			});
			// it is a client side filter
			if (filter.name.indexOf("$client.") == 0) {
				this.records.splice(0);
				nabu.utils.arrays.merge(this.records, this.allRecords.filter(function(x) {
					var matches = true;
					Object.keys(self.filters).forEach(function(filter) {
						// reapply all client filters
						if (filter && filter.indexOf("$client.") == 0) {
							var fieldName = filter.substring("$client.".length);
							if (self.filters[filter] && ("" + x[fieldName]).toLowerCase().indexOf(("" + self.filters[filter]).toLowerCase()) < 0) {
								matches = false;
							}
						}	
					});
					return matches;
				}));
			}
			else {
				// we delay the reload in case of multiple filters firing
				this.delayedLoad();
			}
		},
		clearFilters: function () {
			var self = this;
			this.cell.state.filters.map(function (filter) {
				self.setFilter(filter, null);
			});
		},
		delayedLoad: function() {
			if (this.loadTimer) {
				clearTimeout(this.loadTimer);
				this.loadTimer = null;
			}
			this.loadTimer = setTimeout(this.load, 100);
		},
		setComboFilter: function(value, label) {
			this.setFilter(this.cell.state.filters.filter(function(x) { return x.label == label })[0], value);
		},
		filterCombo: function(value, label) {
			var filter = this.cell.state.filters.filter(function(x) { return x.label == label })[0];
			if (filter.type == 'enumeration') {
				return value ? filter.enumerations.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				}) : filter.enumerations;
			}
			else {
				this.setComboFilter(value, label);
				return [];
			}
		},
		filtersToAdd: function(ignoreCurrentFilters) {
			var self = this;
			var currentFilters = this.cell.state.filters.map(function(x) {
				return x.name;
			});
			// any input parameters that are not bound
			var result = Object.keys(this.inputParameters.properties);
			if (!ignoreCurrentFilters) {
				result = result.filter(function(key) {
					// must not be bound and not yet a filter
					return !self.cell.bindings[key] && (currentFilters.indexOf(key) < 0 || ignoreCurrentFilters);
				});
			}
			if (this.cell.state.allowFrontendFiltering) {
				Object.keys(this.definition).map(function(key) {
					result.push("$client." + key);
				});
			}
			return result;
		},
		addFilter: function() {
			this.cell.state.filters.push({
				field: null,
				label: null,
				type: 'text',
				enumerations: [],
				value: null
			})
		},
		select: function(record, skipTrigger, $event) {
			// if you are hovering over an action, you are most likely triggering that, not selecting
			if ((!$event || this.$services.page.isClickable($event.target)) && (!this.actionHovering || skipTrigger)) {
				if (!this.cell.state.multiselect) {
					this.selected.splice(0, this.selected.length);
				}
				var index = this.selected.indexOf(record);
				// if we are adding it, send out an event
				if (index < 0) {
					this.selected.push(record);
					if (!skipTrigger) {
						this.trigger(null, record);
					}
				}
				else {
					this.selected.splice(index, 1);
				}
			}
		},
		isSelectionAction: function(action) {
			return !action.icon && !action.label && !action.global && action.field == null;
		},
		trigger: function(action, data, skipSelect) {
			if (!action) {
				this.lastTriggered = data;
			}
			// if we are executing a non global action and we have data, select it as well without triggering the select event
			// this is expected behavior as you are clicking on the item
			else if (!action.global && data) {
				this.lastTriggered = data;
				if (!skipSelect) {
					this.select(data, true);
				}
			}
			// if no action is specified, it is the one without the icon and label (and not global)
			// this is row specific (not global) but does not have an actual presence (no icon & label)
			if (!action && !this.actionHovering) {
				// selected events must not be linked to fields
				action = this.cell.state.actions.filter(this.isSelectionAction)[0];
				if (action && action.condition) {
					// we do want to change the event, just with a null value
					if (!this.$services.page.isCondition(action.condition, {record:data}, this)) {
						data = null;
					}
				}
			}
			if (action) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// if there is no data (for a global event) 
				if (action.global) {
					if (action.useSelection) {
						data = this.cell.state.multiselect && this.selected.length > 1 
							? this.selected
							: (this.selected.length ? this.selected[0] : null);
					}
					else if (action.useAll) {
						data = this.records;
					}
					else {
						data = this.$services.page.getPageInstance(this.page, this).get(this.cell.on);
					}
					if (!data) {
						data = {};
					}
					// if we give a live feed to the array, we can update it remotely
					// we don't actually want this, new items can be retrieved through a refresh, selection is not an external concern
					// the problem we had was feeding an array of parameters into a form with a predefined list of parameters
					// the changes were done right in the records of this data which meant we saw them live while typing (cool!) but they could not be undone on cancel
					if (data instanceof Array) {
						var data = data.map(function(x) {
							return nabu.utils.objects.clone(x);
						});
					}
				}
				if (action.name) {
					return pageInstance.emit(action.name, data).then(function() {
						if (action.refresh) {
							self.load();
						}
						else if (action.close) {
							self.$emit("close");
						}
						else if (action.delete) {
							self.records.splice(self.records.indexOf(data), 1);
							// TODO: do the delete in the original array as well?
						}
					});
				}
				else if (action.close) {
					this.$emit("close");
				}
			}
		},
		getFormOperations: function(name) {
			var self = this;
			return this.$services.page.getOperations(function(operation) {
				// must be a put or post
				return (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "post")
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0);
			}).map(function(x) { return x.id });
		},
		normalize: function(state) {
			/*if (!state.transform) {
				Vue.set(state, "transform", null);
			}*/
			if (!state.autoRefresh) {
				Vue.set(state, "autoRefresh", null);
			}
			if (!state.orderBy) {
				Vue.set(state, "orderBy", []);
			}
			if (!state.filterPlaceHolder) {
				Vue.set(state, "filterPlaceHolder", null);
			}
			if (!state.filterType) {
				Vue.set(state, "filterType", null);
			}
			if (!state.title) {
				Vue.set(state, "title", null);
			}
			if (!state.limit) {
				Vue.set(state, "limit", 10);
			}
			// actions you can perform on a single row
			if (!state.actions) {
				Vue.set(state, "actions", []);
			}
			if (!state.filters) {
				Vue.set(state, "filters", []);
			}
			if (!state.fields) {
				Vue.set(state, "fields", []);
			}
			if (this.supportsDetailFields && !state.detailFields) {
				Vue.set(state, "detailFields", []);
			}
			if (!state.updateOperation) {
				Vue.set(state, "updateOperation", null);
			}
			if (!state.updateBindings) {
				Vue.set(state, "updateBindings", {});
			}
			if (!state.multiselect) {
				Vue.set(state, "multiselect", false);
			}
			if (!state.styles) {
				Vue.set(state, "styles", []);
			}
			if (!state.refreshOn) {
				Vue.set(state, "refreshOn", []);
			}
			else {
				var self = this;
				state.filters.map(function(x) {
					Vue.set(self.filters, x.field, null);
				});
			}
			if (!state.showRefresh) {
				Vue.set(state, "showRefresh", false);
			}
			// we add a result entry for each field
			// we can then set formatters for each field
			if (!state.result) {
				Vue.set(state, "result", {});
			}
			Object.keys(this.definition).map(function(key) {
				if (!state.result[key]) {
					Vue.set(state.result, key, {
						label: null,
						format: null,
						custom: null,
						styles: []
					});
				}
			});
			var self = this;
			Object.keys(this.inputParameters).map(function(x) {
				if (!self.cell.bindings[x]) {
					Vue.set(self.cell.bindings, x, null);
				}
			});
		},
		removeAction: function(action) {
			var index = this.cell.state.actions.indexOf(action);
			if (index >= 0) {
				this.cell.state.actions.splice(index, 1);
			}
		},
		getDynamicClasses: function(key, record) {
			// the old way
			if (typeof(key) == "string") {
				var styles = this.cell.state.result[key].styles;
				if (styles) {
					var self = this;
					return styles.filter(function(style) {
						return self.isCondition(style.condition, record, self);
					}).map(function(style) {
						return style.class;
					});
				}
				else {
					return [];
				}
			}
			else {
				
			}
		},
		isCondition: function(condition, record) {
			var state = {
				record: record	
			}
			var $services = this.$services;
			var result = eval(condition);
			if (result instanceof Function) {
				result = result(state);
			}
			return result == true;
		},
		addAction: function() {
			this.cell.state.actions.push({
				name: "unnamed",
				icon: null,
				class: null,
				label: null,
				condition: null,
				refresh: false,
				global: false,
				close: false,
				type: "button",
				useSelection: false
			});
		},
		upAction: function(action) {
			var index = this.cell.state.actions.indexOf(action);
			if (index > 0) {
				var replacement = this.cell.state.actions[index - 1];
				this.cell.state.actions.splice(index - 1, 1, action);
				this.cell.state.actions.splice(index, 1, replacement);
			}
		},
		downAction: function(action) {
			var index = this.cell.state.actions.indexOf(action);
			if (index < this.cell.state.length - 1) {
				var replacement = this.cell.state.actions[index + 1];
				this.cell.state.actions.splice(index + 1, 1, action);
				this.cell.state.actions.splice(index, 1, replacement);
			}
		},
		sort: function(key) {
			if (key) {
				if (this.orderable) {
					var newOrderBy = [];
					if (this.orderBy.indexOf(key) >= 0) {
						newOrderBy.push(key + " desc");
					}
					else if (this.orderBy.indexOf(key + " desc") >= 0) {
						// do nothing, we want to remove the filter
					}
					else {
						newOrderBy.push(key);
					}
					this.orderBy.splice(0, this.orderBy.length);
					nabu.utils.arrays.merge(this.orderBy, newOrderBy);
					if (this.edit) {
						this.cell.state.orderBy.splice(0, this.cell.state.orderBy.length);
						nabu.utils.arrays.merge(this.cell.state.orderBy, this.orderBy);
					}
					this.load();
				}
				// do a frontend sort (can't do it if paged)
				else if (this.cell.state.array || this.cell.state.dynamicArrayType || !this.pageable) {
					var newOrderBy = [];
					var multiplier = 1;
					if (this.orderBy.indexOf(key) >= 0) {
						newOrderBy.push(key + " desc");
						multiplier = -1;
					}
					else if (this.orderBy.indexOf(key + " desc") >= 0) {
						// do nothing, we want to remove the filter
					}
					else {
						newOrderBy.push(key);
					}
					this.orderBy.splice(0, this.orderBy.length);
					nabu.utils.arrays.merge(this.orderBy, newOrderBy);
					if (this.edit) {
						this.cell.state.orderBy.splice(0, this.cell.state.orderBy.length);
						nabu.utils.arrays.merge(this.cell.state.orderBy, this.orderBy);
					}
					if (newOrderBy.length) {
						this.internalSort(key, multiplier);
					}
				}
			}
		},
		internalSort: function(key, multiplier, records) {
			if (records == null) {
				records = this.records;
			}
			records.sort(function(a, b) {
				var valueA = a[key];
				var valueB = b[key];
				var result = 0;
				if (!valueA && valueB) {
					result = -1;
				}
				else if (valueA && !valueB) {
					result = 1;
				}
				else if (valueA instanceof Date && valueB instanceof Date) {
					result = valueA.getTime() - valueB.getTime();
				}
				else if (typeof(valueA) == "string" || typeof(valueB) == "string") {
					result = valueA.localeCompare(valueB);
				}
				return result * multiplier;
			});
		},
		updateFormOperation: function(operationId) {
			if (this.cell.state["updateOperation"] != operationId) {
				Vue.set(this.cell.state, "updateOperation", operationId);
				var operation = this.$services.swagger.operations[operationId];
				var bindings = {};
				var self = this;
				if (operation.parameters) {
					operation.parameters.map(function(parameter) {
						bindings[parameter.name] = self.cell.state.updateBindings && self.cell.state.updateBindings[parameter.name]
							? self.cell.state.updateBindings[parameter.name]
							: null;
					});
					Vue.set(this.cell.state, "updateBindings", bindings);
				}
			}
		},
		updateArray: function(array) {
			Vue.set(this.cell.state, "array", array);
			Vue.set(this.cell, "bindings", {});
			Vue.set(this.cell, "result", {});
			var self = this;
			var regenerate = function() {
				// we clear out the fields, they are most likely useless with another operation
				self.cell.state.fields.splice(0, self.cell.state.fields.length);
				// instead we add entries for all the fields in the return value
				self.keys.map(function(key) {
					self.cell.state.fields.push({
						label: key,
						fragments: [{
							type: "data",
							key: key
						}]
					});
				});
			};
			if (array) {
				if (self.cell.state.fields && self.cell.state.fields.length) {
					this.$confirm({
						message: "Regenerate fields?"
					}).then(regenerate);
				}
				else {
					regenerate();
				}
			}
			this.loadArray();
		},
		pushToArray: function(record) {
			if (this.cell.state.array) {
				var current = this.$services.page.getValue(this.localState, this.cell.state.array);
				if (current == null) {
					current = this.$services.page.getPageInstance(this.page, this).get(this.cell.state.array);
				}
				if (current != null) {
					current.push(record);
				}
				// make sure all records stays up to date
				this.allRecords.push(record);
				// if we are using paging, reload current page, it may have changed
				if (this.paging && this.paging.current != null) {
					this.doInternalSort(this.allRecords);
					this.load(this.paging.current);
				}
				else {
					this.records.push(record);
					this.doInternalSort();
				}
			}
		},
		loadArray: function() {
			if (true) {
				this.load();
			}
			else if (this.cell.state.array) {
				var current = this.$services.page.getValue(this.localState, this.cell.state.array);
				if (current == null) {
					current = this.$services.page.getPageInstance(this.page, this).get(this.cell.state.array);
				}
				if (current) {
					this.records.splice(0, this.records.length);
					nabu.utils.arrays.merge(this.records, current);
					nabu.utils.arrays.merge(this.allRecords, current);
				}
				this.doInternalSort();
			}
		},
		doInternalSort: function(records) {
			if (this.orderBy && this.orderBy.length) {
				var field = this.orderBy[0];
				var index = field.indexOf(" desc");
				var multiplier = 1;
				if (index >= 0) {
					multiplier = -1;
					field = field.substring(0, index);
				}
				this.internalSort(field, multiplier, records);
			}
		},
		updateOperation: function(operationId) {
			if (this.cell.state["operation"] != operationId) {
				Vue.set(this.cell.state, "operation", operationId);
				var bindings = {};
				
				if (operationId) {
					var operation = this.$services.swagger.operations[operationId];
					var self = this;
					if (operation.parameters) {
						operation.parameters.map(function(parameter) {
							bindings[parameter.name] = self.cell.bindings && self.cell.bindings[parameter.name]
								? self.cell.bindings[parameter.name]
								: null;
						});
					}
				}
				
				// TODO: is it OK that we simply remove all bindings?
				// is the table the only one who sets bindings here?
				Vue.set(this.cell, "bindings", bindings);
				
				Vue.set(this.cell, "result", {});
				
				var regenerate = function() {
					// we clear out the fields, they are most likely useless with another operation
					self.cell.state.fields.splice(0, self.cell.state.fields.length);
					// instead we add entries for all the fields in the return value
					self.keys.map(function(key) {
						self.cell.state.fields.push({
							// avoid interpretation...
							label: "%" + "{" + self.$services.page.prettify(key) + "}",
							fragments: [{
								type: "data",
								key: key
							}]
						});
					});
				};
				
				if (operationId) {
					if (self.cell.state.fields && self.cell.state.fields.length) {
						this.$confirm({
							message: "Regenerate fields?"
						}).then(regenerate)
					}
					else {
						regenerate();
					}
				}
				// if there are no parameters required, do an initial load
				if (operationId && !operation.parameters.filter(function(x) { return x.required }).length) {
					this.load();
				}
			}
		},
		update: function(record) {
			var parameters = {};
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			if (this.cell.state.updateOperation) {
				Object.keys(this.cell.state.updateBindings).map(function(key) {
					if (self.cell.state.updateBindings[key]) {
						if (self.cell.state.updateBindings[key].indexOf("record.") == 0) {
							parameters[key] = record[self.cell.state.updateBindings[key].substring("record.".length)];
						}
						else {
							parameters[key] = self.$services.page.getBindingValue(pageInstance, self.cell.state.updateBindings[key], self);
						}
					}
				});
				parameters.body = record;
				this.updating = true;
				return this.$services.swagger.execute(this.cell.state.updateOperation, parameters).then(function() {
					if (self.cell.state.inlineUpdateEvent) {
						pageInstance.emit(self.cell.state.inlineUpdateEvent, record);
					}
					self.updating = false;
				}, function() {
					self.updating = false;
				});
			}
			else if (self.cell.state.inlineUpdateEvent) {
				pageInstance.emit(self.cell.state.inlineUpdateEvent, record);
			}
		},
		isHidden: function(key) {
			return this.cell.state.result[key] && this.cell.state.result[key].format == "hidden";	
		},
		interpret: function(key, value, record) {
			if (value) {
				var format = this.cell.state.result[key] ? this.cell.state.result[key].format : null;
				if (format == "link") {
					if (value.indexOf("http://") == 0 || value.indexOf("https://") == 0) {
						return "<a target='_blank' href='" + value + "'>" + value.replace(/http[s]*:\/\/([^/]+).*/, "$1") + "</a>";
					}
				}
				else if (format == "dateTime") {
					value = new Date(value).toLocaleString();
				}
				else if (format == "date") {
					value = new Date(value).toLocaleDateString();
				}
				else if (format == "time") {
					value = new Date(value).toLocaleTimeString();
				}
				else if (format == "masterdata") {
					value = this.$services.masterdata.resolve(value);
				}
				else if (format == "custom") {
					value = this.formatCustom(key, value, record);
				}
				else if (typeof(value) == "string") {
					value = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
						.replace(/\n/g, "<br/>").replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
				}
			}
			return value;
		},
		formatCustom: function(key, value, record) {
			var state = {
				record: record
			}
			if (this.cell.state.result[key].custom) {
				try {
					var result = eval(this.cell.state.result[key].custom);
					if (result instanceof Function) {
						result = result(key, value, state);	
					}
					return result;
				}
				catch (exception) {
					return exception.message;
				}
			}
		},
		getFilterState: function() {
			if (this.filterState == null) {
				var state = {};
				if (this.cell.state.filters) {
					var self = this;
					var pageInstance = self.$services.page.getPageInstance(self.page, self);
					this.cell.state.filters.map(function(filter) {
						if (self.cell.bindings[filter.name]) {
							state[filter.name] = self.$services.page.getBindingValue(pageInstance, self.cell.bindings[filter.name], self);
						}
					})
				}
				this.filterState = state;
			}
			// merge the currently set filters
			nabu.utils.objects.merge(this.filterState, this.filters);
			return this.filterState;
		},
		next: function() {
			var increment = 1;
			// suppose page is currently 0, limit is 3
			// we add the increment to the offset which is relative to the currently loaded page
			// we already fetched [page, page+limit]
			// now we fetch [page+limit+offset, page+limit+offset+increment]
			// we add the increment to the offset for next time
			this.offset += increment;
			// we make sure we move the page to match the offset
			while (this.offset >= limit) {
				this.page++;
				this.offset -= limit;
			}
		},
		previous: function() {
			
		},
		getRestParameters: function(page) {
			var parameters = {};
			var self = this;
				
			// we put a best effort limit & offset on there, but the operation might not support it
			// at this point the parameter is simply ignored
			var limit = this.cell.state.limit != null ? parseInt(this.cell.state.limit) : 20;
			if (this.dynamicLimit != null) {
				limit = this.dynamicLimit;
			}
			
			var limitName = this.getLimitName();
			var offsetName = this.getOffsetName();
			
			if (limitName != null && limit != 0) {
				parameters[limitName] = limit;
			}
			if (offsetName != null) {
				parameters[offsetName] = (page ? page : 0) * limit;
			}
			
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// bind additional stuff from the page
			Object.keys(this.cell.bindings).map(function(name) {
				if (self.cell.bindings[name]) {
					var value = self.$services.page.getBindingValue(pageInstance, self.cell.bindings[name], self);
					if (value != null && typeof(value) != "undefined") {
						parameters[name] = value;
					}
				}
			});
			this.cell.state.filters.map(function(filter) {
				parameters[filter.name] = filter.type == 'fixed' ? filter.value : self.filters[filter.name];
				/*if (parameters[filter.name] == null && self.cell.bindings[filter.name]) {
					parameters[filter.name] = self.$services.page.getBindingValue(pageInstance, self.cell.bindings[filter.name], self);
				}*/
			});
			
			if (this.orderable && this.orderBy.length) {
				parameters[this.getOrderByName()] = this.orderBy;
			}
			return parameters;
		},
		// see if we have to lazy load more records
		lazyLoad: function(record) {
			// current is 0-based
			if (this.lazyPromise == null && this.paging && this.cell.state.loadLazy && this.paging.current != null && this.paging.total != null && this.paging.current < this.paging.total - 1) {
				var index = this.records.indexOf(record);
				// if we are in the final 10% of the table, try to load more
				if (index >= Math.floor(this.records.length * 0.9)) {
					this.lazyPromise = this.load(this.paging.current + 1, true);
					var self = this;
					this.lazyPromise.then(function() {
						self.lazyPromise = null;
					}, function() {
						self.lazyPromise = null;
					});
				}
			}
		},
		loadNext: function() {
			this.load(this.paging.current != null ? this.paging.current + 1 : 0);
		},
		loadPrevious: function() {
			this.load(this.paging.current != null ? this.paging.current - 1 : 0);
		},
		reload: function(page) {
			var self = this;
			if (self.cell.state.autoRefresh && !this.destroyed) {
				if (self.refreshTimer != null) {
					clearTimeout(self.refreshTimer);
					self.refreshTimer = null;
				}
				self.refreshTimer = setTimeout(function() {
					// don't refresh if explicitly blocked or if updating
					if (!self.blockRefresh && !self.updating) {
						try {
							self.load(page);
						}
						catch (exception) {
							self.reload(page);
						}
					}
					else {
						self.reload(page);
					}
				}, self.cell.state.autoRefresh);
			}
		},
		updateRecord: function(oldRecord, newRecord) {
			var newKeys = Object.keys(newRecord);
			var oldKeys = Object.keys(oldRecord);
			// hard override
			newKeys.forEach(function(key) {
				oldRecord[key] = newRecord[key];
			});
			// any existing keys that do not exist in the new data, we set to null
			oldKeys.filter(function(x) { return newKeys.indexOf(x) < 0 }).forEach(function(key) {
				oldRecord[key] = null;	
			});
		},
		// post process the records before we add them
		postProcess: function(records) {
			var self = this;
			if (this.cell.state.aggregations) {
				// first we perform the group by
				var groupBy = this.cell.state.aggregations.filter(function(x) { return x.field && x.operation == "group by" });
				// only proceed if we actually have a group by
				if (groupBy.length) {
					// first we group
					var result = {};
					records.forEach(function(x) {
						var key = "";
						groupBy.forEach(function(g) {
							if (key != "") {
								key += "::";
							}
							key += self.$services.page.getValue(x, g.field);
						});
						if (!result[key]) {
							result[key] = [];
						}
						result[key].push(x);
					});
					records = [];
					// then we aggregate (if any)
					var aggregations = this.cell.state.aggregations.filter(function(x) { return x.field && x.operation != "group by" });
					if (aggregations.length) {
						// for each grouped array
						Object.keys(result).forEach(function(key) {
							var start = result[key][0];
							// we need at least two records to have useful aggregation
							if (result[key].length >= 2) {
								for (var i = 1; i < result[key].length; i++) {
									aggregations.forEach(function(a) {
										if (a.operation == "sum" || a.operation == "average") {
											start[a.field] += result[key][i][a.field];
										}
										else if (a.operation == "min") {
											start[a.field] = Math.min(start[a.field], result[key][i][a.field]);
										}
										else if (a.operation == "max") {
											start[a.field] = Math.max(start[a.field], result[key][i][a.field]);
										}
									});
								}
								aggregations.forEach(function(a) {
									if (a.operation == "average") {
										start[a.field] = start[a.field] / result[key].length;
									}
								});
							}
							records.push(start);
						});
						this.doInternalSort(records);
					}
					// if there are no actual aggregations, we just take the first record
					// they should still be in the correct order
					else {
						Object.keys(result).forEach(function(key) {
							var start = result[key][0];
							records.push(start);
						});
					}
					// use internalSort according to original order by criteria
				}
			}
			if (self.cell.state.reverseData) {
				records.reverse();
			}
			return records;
		},
		pushAggregation: function() {
			if (!this.cell.state.aggregations) {
				Vue.set(this.cell.state, "aggregations", []);
			}
			this.cell.state.aggregations.push({});
		},
		// how much to increment by
		load: function(page, append, increment) {
			// if we are doing a new load, unsubscribe from any stream subscriptions you might have
			// we'll start a new subscription if relevant
			this.streamSubscriptions.splice(0).forEach(function(x) { x() });
			
			if (this.refreshTimer) {
				clearTimeout(this.refreshTimer);
				this.refreshTimer = null;
			}
			var promise = this.$services.q.defer();
			var self = this;
			if (this.cell.state.operation) {
				var parameters = this.getRestParameters(page);
				// allows us to modify the response based on the raw xmlhttprequest
				// we don't actually want to modify it, but we do want to capture the headers
				// you need to have the websocket component and an up to date version of the utils that contains the jwt
				if (self.$services.websocket && nabu.utils.jwt) {
					parameters.$$rawMapper = function(response, raw) {
						if (self.cell.state.subscribeStream) {
							var token = raw.getResponseHeader("Stream-Token");
							if (token) {
								var parsed = nabu.utils.jwt.parse(token);
								self.$services.websocket.send("stream-subscribe", {
									jwtToken: token
								});
								// we want to push an unsubscribe function
								self.streamSubscriptions.push(function() {
									self.$services.websocket.send("stream-unsubscribe", {
										jwtId: parsed.jti
									});
								});
								self.streamSubscriptions.push(self.$services.websocket.subscribe(function(data) {
									if (data.type == "subscription-data") {
										// it's for us!
										if (data.content.subscriptionId == parsed.jti) {
											var found = false;
											// if we have a primary key, check if it's an update to something we know
											if (parsed.p) {
												var recordsToRemove = [];
												self.records.forEach(function(record) {
													// check if we found it!
													if (record[parsed.p] == data.content.data[parsed.p]) {
														found = true;
														// we must evaluate if the updated data still matches the filter
														if (!parsed.j || self.$services.page.evalInContext(data.content.data, parsed.j)) {
															if (self.pushUpdate) {
																self.pushUpdate(record, data.content.data);
															}
															else {
																self.updateRecord(record, data.content.data);
																//var newKeys = Object.keys(data.content.data);
																//var oldKeys = Object.keys(record);
																//// hard override
																//newKeys.forEach(function(key) {
																//	record[key] = data.content.data[key];
																//});
																//// any existing keys that do not exist in the new data, we set to null
																//oldKeys.filter(function(x) { return newKeys.indexOf(x) < 0 }).forEach(function(key) {
																//	record[key] = null;	
																//});
															}
														}
														else {
															recordsToRemove.push(record);
														}
													}
												});
												// we don't do this in the foreach above, deleting while looping is probably not a good idea...
												recordsToRemove.forEach(function(record) {
													var index = self.records.indexOf(record);	
													if (index >= 0) {
														if (self.pushDelete) {
															self.pushDelete(record, index);
														}
														else {
															self.records.splice(index, 1);
														}
													}
												});
											}
											if (!found) {
												if (!parsed.j || self.$services.page.evalInContext(data.content.data, parsed.j)) {
													if (self.pushCreate) {
														self.pushCreate(data.content.data);
													}
													else {
														self.records.push(data.content.data);
													}
													var limit = self.cell.state.limit != null ? parseInt(self.cell.state.limit) : null;
													if (self.dynamicLimit != null) {
														limit = self.dynamicLimit;
													}
													// if we are over the limit, toss the first record
													if (limit && self.records.length > limit) {
														if (self.pushDelete) {
															self.pushDelete(self.records[0], 0);
														}
														else {
															self.records.splice(0, 1);
														}
													}
												}
											}
										}
									}
								}));
							}
						}
						return response;
					}
				}
				try {
					var operationPromise = this.$services.swagger.execute(this.cell.state.operation, parameters).then(function(list) {
						if (!append) {
							self.records.splice(0, self.records.length);
						}
						if (list) {
							var arrayFound = false;
							var findArray = function(root) {
								Object.keys(root).forEach(function(field) {
									if (root[field] instanceof Array && !arrayFound) {
										root[field] = self.postProcess(root[field]);
										root[field].forEach(function(x, i) {
											if (x) {
												x.$position = i;
											}
										});
										nabu.utils.arrays.merge(self.records, root[field]);
										nabu.utils.arrays.merge(self.allRecords, root[field]);
										arrayFound = true;
									}
									if (!arrayFound && typeof(root[field]) === "object" && root[field] != null) {
										findArray(root[field]);
									}
								});
							}
							findArray(list);
							
							var pageFound = false;
							var findPage = function(root) {
								Object.keys(root).forEach(function(field) {
									// check if we have an object that has the necessary information
									if (typeof(root[field]) === "object" && root[field] != null && !pageFound) {
										// these are the two fields we use and map, check if they exist
										if (root[field].current != null && root[field].total != null) {
											nabu.utils.objects.merge(self.paging, root[field]);
											pageFound = true;
										}
										// recurse
										if (!pageFound) {
											findPage(root[field]);
										}
									}
								});
							}
							findPage(list);
							if (!pageFound && !self.orderable) {
								self.doInternalSort();
							}
						}
						self.last = new Date();
						if (self.cell.state.autoRefresh) {
							self.reload(page);
						}
						promise.resolve();
					}, function(error) {
						promise.resolve(error);
					});
					if (this.cell.state.slowOperation) {
						this.$wait({promise: operationPromise});
					}
				}
				catch(error) {
					console.error("Could not run", this.cell.state.operation, error);
					promise.resolve(error);
				}
			}
			else if (this.cell.state.array || this.cell.state.dynamicArrayType) {
				var current = this.cell.state.dynamicArrayType ? this.dynamicArray : this.$services.page.getValue(this.localState, this.cell.state.array);
				if (current == null) {
					current = this.$services.page.getPageInstance(this.page, this).get(this.cell.state.array);
				}
				if (current) {
					current = self.postProcess(current);
					if (!append) {
						this.records.splice(0, this.records.length);
					}
					// only reload the data if we have no data as of yet
					// otherwise we might lose state that was added via pushToArray
					if (!this.allRecords.length) {
						if (this.cell.state.arrayFilter) {
							current = current.filter(function(record) {
								return self.$services.page.isCondition(self.cell.state.arrayFilter, record, self);
							});
						}
						nabu.utils.arrays.merge(this.allRecords, current);
					}
					this.doInternalSort(this.allRecords);
					// if we set a limit, only get those records
					if (this.cell.state.limit && this.cell.state.limit != 0) {
						var start = page ? page * parseInt(this.cell.state.limit) : 0;
						var end = start + parseInt(this.cell.state.limit);
						// only add something to records if we are still inside the array
						if (start < this.allRecords.length) {
							end = Math.min(end, this.allRecords.length);
							nabu.utils.arrays.merge(this.records, this.allRecords.slice(start, end));
						}
						this.paging.current = page ? page : 0;
						this.paging.totalRowCount = this.allRecords.length;
						this.paging.pageSize = parseInt(this.cell.state.limit);
						this.paging.rowOffset = start;
						this.paging.total = Math.ceil(this.allRecords.length / parseInt(this.cell.state.limit));
					}
					else {
						nabu.utils.arrays.merge(this.records, this.allRecords);
					}
					var highest = this.records.reduce(function(previousValue, currentValue) {
						return currentValue.hasOwnProperty("$position") && currentValue["$position"] > previousValue ? currentValue["$position"] : previousValue;
					}, 0);
					this.records.forEach(function(x, i) {
						// this is obviously not an exact science, we will be skipping some indexes but it doesn't matter, as long as it's unique
						// we are very unlikely to overflow...
						// otherwise, may need to optimize this
						if (!x.hasOwnProperty("$position")) {
							x.$position = highest + i;
						}
					});
					promise.resolve();
					//nabu.utils.arrays.merge(this.records, current);
				}
			}
			else {
				promise.resolve("No operation found");
			}
			return promise;
		}
	}
});

Vue.component("data-common-header", {
	template: "#data-common-header",
	mixins:[nabu.page.views.data.DataCommon],
	props: {
		configuring: {
			type: Boolean,
			required: true
		}
	},
	data: function() {
		return {
			isHeader: true
		}	
	},
	created: function() {
		this.create();
	}
}); 

Vue.component("data-common-footer", {
	template: "#data-common-footer",
	mixins:[nabu.page.views.data.DataCommon],
	/*props: {
		globalActions: {
			type: Array,
			required: false
		}
	}*/
	created: function() {
		this.create();
	}
});

Vue.component("data-common-configure", {
	template: "#data-common-configure",
	mixins:[nabu.page.views.data.DataCommon],
	props: {
		getSections: {
			type: Function,
			required: false
		}
	}
});

Vue.component("data-common-prev-next", {
	template: "#data-common-prev-next",
	props: {
		hasNext: {
			type: Boolean,
			required: false
		},
		hasPrevious: {
			type: Boolean,
			required: false
		},
		prevButtonLabel: {
			required: false
		},
		nextButtonLabel: {
			required: false
		}
	}
})

Vue.component("data-common-filter", {
	template: "#data-common-filter",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		filters: {
			type: Array
		},
		orderable: {
			type: Boolean,
			required: false
		},
		state: {
			type: Object,
			required: true
		}
	}
})



