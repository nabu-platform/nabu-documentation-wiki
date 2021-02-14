Vue.component("page-form-input-enumeration-provider-configure", {
	template: "<n-form-section><n-form-combo v-model='field.enumerationProvider' :filter='enumerationFilter' label='Enumeration Provider'/>"
		+ " <n-form-switch v-model='field.showRadioView' label='Show radio visualisation'/>"
		+ " <n-form-switch v-model='field.required' label='Required'/>"
		+ "	<n-form-combo v-if='valueOptions' :items='valueOptions' v-model='field.enumerationProviderValue' label='Value Field'/>"
		+ "	<n-form-combo v-if='labelOptions' :items='labelOptions' v-model='field.enumerationProviderLabel' label='Label Field'/>"
		+ "</n-form-section>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		// the fragment this image is in
		field: {
			type: Object,
			required: true
		}
	},
	created: function() {
		if (!this.field.enumerationProvider) {
			Vue.set(this.field, "enumerationProvider", null);
		}
	},
	computed: {
		valueOptions: function() {
			if (this.field.enumerationProvider != null) {
				var self = this;
				var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
				var provider = nabu.page.providers("page-enumerate").filter(function(x) { return x.name == self.field.enumerationProvider })[0];
				if (provider && provider.values) {
					return provider.values;
				}
			}
			return null;
		},
		labelOptions: function() {
			if (this.field.enumerationProvider != null) {
				var self = this;
				var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
				var provider = nabu.page.providers("page-enumerate").filter(function(x) { return x.name == self.field.enumerationProvider })[0];
				if (provider && provider.labels) {
					return provider.labels;
				}
			}
			return null;
		},
	},
	methods: {
		enumerationFilter: function(value) {
			var providers = nabu.page.providers("page-enumerate").map(function(x) { return x.name });
			if (value) {
				providers = providers.filter(function(x) { return x.toLowerCase().indeOf(value.toLowerCase()) >= 0 });
			}
			providers.sort();
			return providers;
		}
	}
});

Vue.component("page-form-input-enumeration-provider", {
	template: "<div><n-form-radio v-if='field.showRadioView' :items='provider.enumerate()' ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:formatter='enumerationFormatter'"
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		v-bubble:label"
			+ "		:schema='schema'"
			+ "		:description='field.description ? $services.page.translate(field.description) : null'"
			+ "		:descriptionType='field.descriptionType'"
			+ "		:descriptionIcon='field.descriptionIcon'"
			+ "		:required='field.required'"
			+ "		:extracter='enumerationExtracter'"
			+ "		:disabled='disabled'/>"
			+ " <n-form-combo v-else ref='form' :filter='enumerationFilter' :formatter='enumerationFormatter' :extracter='enumerationExtracter'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		:required='field.required ? field.required : null'"
			+ "		v-bubble:label"
			+ "		v-bubble:blur"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:description='field.description'"
			+ "		:description-type='field.descriptionType'"
			+ "		:description-icon='field.descriptionIcon'"
			+ "		:schema='schema'"
			+ "		:disabled='disabled'/></div>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		},
		value: {
			required: true
		},
		label: {
			type: String,
			required: false
		},
		timeout: {
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		schema: {
			type: Object,
			required: false
		},
		readOnly: {
			type: Boolean,
			required: false
		},
		placeholder: {
			type: String,
			required: false
		}
	},
	data: function() {
		return {
			provider: null
		}
	},
	created: function() {
		this.provider = this.getProvider();
	},
	methods: {
		getProvider: function() {
			if (this.field.enumerationProvider) {
				var self = this;
				return nabu.page.providers("page-enumerate").filter(function(x) { return x.name == self.field.enumerationProvider })[0];
			}
			return null;
		},
		enumerationFilter: function(value) {
			var provider = this.provider;
			if (provider) {
				var values = provider.enumerate();
				var self = this;
				if (value) {
					values = values.filter(function(x) {
						var formatted = self.enumerationFormatter(x);
						return formatted.toLowerCase().indexOf(value.toLowerCase()) >= 0;
					});
				}
				values.sort(function(a, b) {
					var valueA = self.enumerationFormatter(a);
					var valueB = self.enumerationFormatter(b);
					return valueA ? valueA.localeCompare(valueB) : (valueB ? -1 : 0);
				});
				return values;
			}
			else {
				return [];
			}
		},
		enumerationFormatter: function(value) {
			var provider = this.provider;
			if (value && this.field.enumerationProviderLabel) {
				return value[this.field.enumerationProviderLabel];
			}
			else if (value && provider && provider.label) {
				return value[provider.label];
			}
			return value;
		},
		enumerationExtracter: function(value) {
			var provider = this.provider;
			if (value && this.field.enumerationProviderValue) {
				return value[this.field.enumerationProviderValue];
			}
			else if (value && provider && provider.value) {
				return value[provider.value];
			}
			return value;
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});