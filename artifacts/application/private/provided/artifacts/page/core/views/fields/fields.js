if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

nabu.page.views.PageFieldsEdit = Vue.component("page-fields-edit", {
	template: "#page-fields-edit",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		allowMultiple: {
			type: Boolean,
			required: false,
			default: true
		},
		keys: {
			type: Array,
			required: false
		},
		allowEditable: {
			type: Boolean,
			required: false,
			default: false
		},
		localState: {
			type: Object,
			required: false
		},
		fieldsName: {
			type: String,
			required: false,
			default: "fields"
		},
		basic: {
			type: Boolean,
			required: false,
			default: false
		},
		allowArbitrary: {
			type: Boolean,
			required: false,
			default: true
		},
		allowEvents: {
			type: Boolean,
			default: true
		}
	},
	created: function() {
		if (!this.cell.state[this.fieldsName]) {
			Vue.set(this.cell.state, this.fieldsName, []);
		}
		if (!this.allowMultiple && !this.cell.state[this.fieldsName].length) {
			this.addField();
		}
		this.normalize();
	},
	computed: {
		fragmentTypes: function() {
			var provided = nabu.page.providers("page-field-fragment");
			// if we don't allow editable fields (because we have nowhere to update them to), ignore the update types (e.g. form)
			if (!this.allowEditable) {
				provided = provided.filter(function(x) { return !x.editable });
			}
			provided = provided.map(function(x) {
				 return x.name;
			});
			provided.sort();
			return provided;
		}
	},
	methods: {
		getProvidedConfiguration: function(fragmentType) {
			var provided = nabu.page.providers("page-field-fragment").filter(function(x) {
				 return x.name == fragmentType;
			})[0];
			return provided ? provided.configure : null;
		},
		normalize: function() {
			this.cell.state[this.fieldsName].map(function(field) {
				if (!field.label) {
					Vue.set(field, "label", null);
				}
				if (!field.fragments) {
					Vue.set(field, "fragments", []);
				}
				if (!field.styles) {
					Vue.set(field, "styles", []);
				}
				if (!field.hidden) {
					Vue.set(field, "hidden", null);
				}
				field.fragments.map(function(fragment) {
					if (!fragment.type) {
						Vue.set(fragment, "type", "data");
					}
					if (!fragment.content) {
						Vue.set(fragment, "content", null);
					}
					if (!fragment.format) {
						Vue.set(fragment, "format", null);
					}
					if (!fragment.javascript) {
						Vue.set(fragment, "javascript", null);
					}
					if (!fragment.template) {
						Vue.set(fragment, "template", null);
					}
					if (!fragment.class) {
						Vue.set(fragment, "class", null);
					}
					if (!fragment.key) {
						Vue.set(fragment, "key", null);
					}
					if (!fragment.form) {
						Vue.set(fragment, "form", {});
					}
				});
			});
		},
		addStyle: function(field) {
			field.styles.push({
				class: null,
				condition: null
			});
		},
		fieldUp: function(field) {
			var index = this.cell.state[this.fieldsName].indexOf(field);
			if (index > 0) {
				var replacement = this.cell.state[this.fieldsName][index - 1];
				this.cell.state[this.fieldsName].splice(index - 1, 1, field);
				this.cell.state[this.fieldsName].splice(index, 1, replacement);
			}
		},
		fieldDown: function(field) {
			var index = this.cell.state[this.fieldsName].indexOf(field);
			if (index < this.cell.state[this.fieldsName].length - 1) {
				var replacement = this.cell.state[this.fieldsName][index + 1];
				this.cell.state[this.fieldsName].splice(index + 1, 1, field);
				this.cell.state[this.fieldsName].splice(index, 1, replacement);
			}
		},
		fieldBeginning: function(field) {
			var index = this.cell.state[this.fieldsName].indexOf(field);
			if (index > 0) {
				this.cell.state[this.fieldsName].splice(index, 1);
				this.cell.state[this.fieldsName].unshift(field);
			}
		},
		fieldEnd: function(field) {
			var index = this.cell.state[this.fieldsName].indexOf(field);
			if (index < this.cell.state[this.fieldsName].length - 1) {
				this.cell.state[this.fieldsName].splice(index, 1);
				this.cell.state[this.fieldsName].push(field);
			}
		},
		up: function(field, fragment) {
			var index = field.fragments.indexOf(fragment);
			if (index > 0) {
				var replacement = field.fragments[index - 1];
				field.fragments.splice(index - 1, 1, fragment);
				field.fragments.splice(index, 1, replacement);
			}
		},
		down: function(field, fragment) {
			var index = field.fragments.indexOf(fragment);
			if (index < field.fragments.length - 1) {
				var replacement = field.fragments[index + 1];
				field.fragments.splice(index + 1, 1, fragment);
				field.fragments.splice(index, 1, replacement);
			}
		},
		addField: function(arbitrary) {
			this.cell.state[this.fieldsName].push({
				label: null,
				info: null,
				infoIcon: null,
				fragments: [],
				hidden: null,
				styles: [],
				arbitrary: !!arbitrary
			});
			// already add a fragment, a field is generally useless without it...
			this.addFragment(this.cell.state[this.fieldsName][this.cell.state[this.fieldsName].length - 1]);
		},
		addFragment: function(field) {
			// default to a data fragment (generally the case)
			field.fragments.push({
				type: "data",
				content: null,
				format: null,
				javascript: null,
				template: null,
				class: null,
				key: null,
				disabled: null,
				hidden: null,
				form: {}
			});
		},
		getKeys: function(value) {
			var keys;
			// you can provide external keys
			if (this.keys) {
				keys = this.keys;
			}
			else {
				// otherwise we just try to get the default ones available to you
				var parameters = this.$services.page.getAvailableParameters(this.page, this.cell, true);
				keys = this.$services.page.getSimpleKeysFor({properties:parameters});
			}
			return value ? keys.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 }) : keys;
		}
	}
});

Vue.component("page-fields-edit-main", {
	template: "#page-fields-edit-main",
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
		data: {
			required: false
		},
		shouldStyle: {
			type: Boolean,
			required: false,
			default: true
		},
		label: {
			type: Boolean,
			required: false,
			default: null
		},
		localState: {
			type: Object,
			required: false
		},
		fieldsName: {
			type: String,
			required: false,
			default: "fields"
		}
	}
})

nabu.page.views.PageFields = Vue.component("page-fields", {
	template: "#page-fields",
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
		data: {
			required: false
		},
		shouldStyle: {
			type: Boolean,
			required: false,
			default: true
		},
		label: {
			type: Boolean,
			required: false,
			default: null
		},
		localState: {
			type: Object,
			required: false
		},
		fieldsName: {
			type: String,
			required: false,
			default: "fields"
		}
	},
	data: function() {
		return {
			configuring: false
		}
	},
	created: function() {
		this.normalize(this.cell.state);
	},
	methods: {
		/*
		configure: function() {
			this.configuring = true;	
		},
		*/
		configurator: function() {
			return "page-fields-edit-main";
		},
		normalize: function(state) {
			if (!state.class) {
				Vue.set(state, "class", null);
			}
		},
		getEvents: function() {
			var result = {};
			var self = this;
			if (this.cell.state[this.fieldsName]) {
				this.cell.state[this.fieldsName].forEach(function(field) {
					if (field.fragments) {
						field.fragments.forEach(function(fragment) {
							if (fragment.clickEvent) {
								if (typeof(fragment.clickEvent) == "string") {
									result[fragment.clickEvent] = {};
								}
								else if (nabu.page.event.getName(fragment, "clickEvent") && nabu.page.event.getName(fragment, "clickEvent") != "$close") {
									var type = nabu.page.event.getType(fragment, "clickEvent");
									if (type.properties && Object.keys(type.properties).length == 0 && self.cell.on) {
										type = self.cell.on;
									}
									result[nabu.page.event.getName(fragment, "clickEvent")] = type;
								}
							}	
						});
					}	
				});
			}
			return result;
		}
	}
});

nabu.page.views.PageFieldsTable = Vue.component("page-fields-table", {
	template: "#page-fields-table",
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
		data: {
			required: false
		},
		shouldStyle: {
			type: Boolean,
			required: false,
			default: true
		},
		label: {
			type: Boolean,
			required: false,
			default: null
		},
		localState: {
			type: Object,
			required: false
		},
		fieldsName: {
			type: String,
			required: false,
			default: "fields"
		}
	},
	data: function() {
		return {
			configuring: false
		}
	},
	created: function() {
		this.normalize(this.cell.state);
	},
	methods: {
		configure: function() {
			this.configuring = true;	
		},
		normalize: function(state) {
			if (!state.class) {
				Vue.set(state, "class", null);
			}
			if (!state.display) {
				Vue.set(state, "class", "row");
			}
		},
		getEvents: function() {
			var result = {};
			var self = this;
			if (this.cell.state[this.fieldsName]) {
				this.cell.state[this.fieldsName].forEach(function(field) {
					if (field.fragments) {
						field.fragments.forEach(function(fragment) {
							if (fragment.clickEvent) {
								if (typeof(fragment.clickEvent) == "string") {
									result[fragment.clickEvent] = {};
								}
								else if (nabu.page.event.getName(fragment, "clickEvent") && nabu.page.event.getName(fragment, "clickEvent") != "$close") {
									var type = nabu.page.event.getType(fragment, "clickEvent");
									if (type.properties && Object.keys(type.properties).length == 0 && self.cell.on) {
										type = self.cell.on;
									}
									result[nabu.page.event.getName(fragment, "clickEvent")] = type;
								}
							}	
						});
					}	
				});
			}
			return result;
		}
	}
});

Vue.component("page-field", {
	template: "#page-field",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		data: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		},
		shouldStyle: {
			type: Boolean,
			required: false
		},
		label: {
			type: Boolean,
			required: false
		},
		edit: {
			type: Boolean,
			required: false
		},
		actions: {
			type: Array,
			required: false,
			default: function() {
				return [];
			}
		}
	},
	computed: {
		// the action that applies to the entire field (if any)
		fieldAction: function() {
			return this.actions.filter(function(x) {
				return !x.icon && !x.label;
			})[0];
		},
		otherActions: function() {
			return this.actions.filter(function(x) {
				return x.icon || x.label;
			})
		}
	},
	methods: {
		trigger: function(action) {
			if (action) {
				if (!action.condition || this.$services.page.isCondition(action.condition, {record:this.data}, this)) {
					var pageInstance = this.$services.page.getPageInstance(this.page, this);
					return pageInstance.emit(action.name, this.data);
				}
			}
		},
		hasClickEvent: function(fragment) {
			if (!fragment.clickEvent) {
				return false;
			}
			else if (typeof(fragment.clickEvent) == "string") {
				return true;
			}
			else {
				return nabu.page.event.getName(fragment, "clickEvent");
			}	
		},
		handleClick: function(fragment) {
			if (this.hasClickEvent(fragment)) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				pageInstance.emit(
					nabu.page.event.getName(fragment, "clickEvent"),
					nabu.page.event.getInstance(fragment, "clickEvent", self.page, self)
				);
			}	
		},
		getDynamicClasses: function(field) {
			var classes = null;
			if (this.shouldStyle) {
				classes = this.$services.page.getDynamicClasses(field.styles, this.data, this);
			}
			else {
				classes = [];
			}
			if (this.label) {
				classes.push("with-label");
			}
			if (this.fieldAction) {
				classes.push("with-action");
			}
			return classes;
		},
		getProvidedComponent: function(fragmentType) {
			var provided = nabu.page.providers("page-field-fragment").filter(function(x) {
				 return x.name == fragmentType;
			})[0];
			return provided ? provided.component : null;
		},
		isHidden: function(fragment) {
			if (!!fragment.hidden) {
				return this.$services.page.isCondition(fragment.hidden, {record:this.data}, this); 
			}
			return false;
		}
	}
});

Vue.component("page-formatted-configure", {
	template: "#page-formatted-configure",
	props: {
		page: {
			type: Object,
			required: true,
		},
		cell: {
			type: Object,
			required: true
		},
		fragment: {
			type: Object,
			required: true
		},
		allowHtml: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	created: function() {
		this.normalize(this.fragment);
	},
	computed: {
		nativeTypes: function() {
			var types = ['date', 'number', 'masterdata', 'javascript', 'text', 'literal'];
			if (this.allowHtml) {
				types.push('link');
				types.push('html');
				types.push('checkbox');
			}
			return types;
		},
		types: function() {
			var types = [];
			nabu.utils.arrays.merge(types, this.nativeTypes);
			nabu.utils.arrays.merge(types, nabu.page.providers("page-format").map(function(x) { return x.name }));
			types.sort();
			return types;
		},
		skipCompile: function() {
			var self = this;
			// don't compile literals
			if (this.fragment.format == "literal") {
				return true;
			}
			var formatter = nabu.page.providers("page-format").filter(function(x) { return x.name == self.fragment.format })[0];
			return formatter && formatter.skipCompile;
		}
	},
	methods: {
		isProvided: function(type) {
			return this.nativeTypes.indexOf(type) < 0;
		},
		getConfiguration: function(type) {
			var provider = nabu.page.providers("page-format").filter(function(x) { return x.name == type })[0];
			return provider ? provider.configure : null;
		},
		normalize: function(fragment) {
			if (!fragment.dateFormat) {
				Vue.set(fragment, "dateFormat", null);
			}
			if (!fragment.tag) {
				Vue.set(fragment, "tag", null);
			}
			if (!fragment.html) {
				Vue.set(fragment, "html", null);
			}
			if (!fragment.javascript) {
				Vue.set(fragment, "javascript", null);
			}
			if (!fragment.amountOfDecimals) {
				Vue.set(fragment, "amountOfDecimals", null);
			}
		}
	}
});

Vue.component("page-formatted", {
	template: "<component :is='tag' v-content.parameterized=\"{value:formatted,plain:fragment.format == 'text', sanitize: !isHtml, compile: (mustCompile || fragment.compile) && !skipCompile }\"/>",
	props: {
		page: {
			type: Object,
			required: true,
		},
		cell: {
			type: Object,
			required: true
		},
		value: {
			required: false
		},
		fragment: {
			type: Object,
			required: true
		}
	},
	computed: {
		nativeTypes: function() {
			var types = ['date', 'number', 'masterdata', 'javascript', 'literal'];
			if (this.allowHtml) {
				types.push('link');
				types.push('html');
				types.push('checkbox');
			}
			return types;
		},
		tag: function() {
			if (this.fragment.tag) {
				return this.fragment.tag;	
			}
			else {
				return "span";
			}
		},
		isHtml: function() {
			if (!this.fragment.format) {
				return false;
			}
			if (["link", "html", "checkbox"].indexOf(this.fragment.format) >= 0) {
				return true;
			}
			var self = this;
			var formatter = nabu.page.providers("page-format").filter(function(x) { return x.name == self.fragment.format })[0];
			return formatter && formatter.html;
		},
		skipCompile: function() {
			var self = this;
			// don't compile literals
			if (this.fragment.format == "literal") {
				return true;
			}
			var formatter = nabu.page.providers("page-format").filter(function(x) { return x.name == self.fragment.format })[0];
			return formatter && formatter.skipCompile;
		},
		mustCompile: function() {
			return this.fragment.format == "checkbox";	
		},
		formatted: function() {
			if (this.fragment.format == "checkbox") {
				return "<n-form-checkbox :value='value' />";
			}
			else if (this.value == null || typeof(this.value) == "undefined") {
				return null;
			}
			// formatting is optional
			else if (this.fragment.format == null || this.fragment.format == "text") {
				if (this.fragment.maxLength && this.value) {
					var result = ("" + this.value);
					if (result.length > parseInt(this.fragment.maxLength)) {
						result = result.substring(0, parseInt(this.fragment.maxLength)) + "...";
					}
				}
				return this.value;
			}
			else if (this.fragment.format == "literal") {
				return this.value.replace ? this.value.replace(/</g, "&lt;").replace(/>/g, "&gt;") : null;
			}
			else if (this.fragment.format == "html") {
				return this.fragment.html ? this.fragment.html : this.value;
			}
			else if (this.fragment.format == "link") {
				return "<a target='_blank' ref='noopener noreferrer nofollow' href='" + this.value + "'>" + this.value.replace(/http[s]*:\/\/([^/]+).*/, "$1") + "</a>";
			}
			// if it is native, format it that way
			else if (this.nativeTypes.indexOf(this.fragment.format) >= 0) {
				return this.$services.formatter.format(this.value, this.fragment);
			}
			// otherwise we are using a provider
			else {
				var self = this;
				var result = nabu.page.providers("page-format").filter(function(x) { return x.name == self.fragment.format })[0]
					.format(this.value, this.fragment, this.page, this.cell);
				return result;
			}
		}
	}
});