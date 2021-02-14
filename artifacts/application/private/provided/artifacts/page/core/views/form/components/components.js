if (!nabu) { var nabu = {} };
if (!nabu.page) { nabu.page = {} };
if (!nabu.page.views) { nabu.page.views = {} };

nabu.page.views.FormComponent = Vue.component("nabu-form-component", {
	template: "#nabu-form-component",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		formComponent: {
			type: String,
			required: false,
			default: "page-form-input-text"
		},
		configurationComponent: {
			type: String,
			required: false,
			default: "page-form-input-text-configure"
		}
	},
	data: function() {
		return {
			configuring: false
		}
	},
	methods: {
		configure: function() {
			this.configuring = true;
		},
		getPageInstance: function() {
			return this.$services.page.getPageInstance(this.page, this);	
		},
		isDisabled: function() {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(this.page, this);
			var state = self.$services.page.getPageState(pageInstance);
			return !!this.cell.state.disabled && this.$services.page.isCondition(this.cell.state.disabled, state, this);
		},
		getSchema: function() {
			if (!this.cell.state.name) {
				return null;
			}
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
			var definition = this.$services.page.getPageParameters(this.page);
			var parts = this.cell.state.name.split(".");
			return definition ? recursiveGet(definition, parts, 0) : null;
		},
		availableFields: function(value) {
			var fields = [];
			var parameters = this.$services.page.getPageParameters(this.page);
			nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor(parameters, true, true));
			console.log("fields are", fields);
			fields.sort();
			if (value) {
				fields = fields.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return fields;
		},
		update: function(value) {
			this.getPageInstance().set(this.cell.state.name, value);
		},
		validate: function () {
			if (this.$refs && this.$refs.input) {
				this.$refs.input.validate();
			}
		},
		blur: function() {
			if (this.cell.state.validateOnBlur) {
				this.validate();
			}
		}
	}
})