Vue.component("page-form-input-location-configure", {
	template: "<n-form-section>"
		+ "	<n-form-text v-model='field.countryRestriction' label='Country limitation (two letter code, comma separated)'/>"
		+ "	<n-form-combo v-model='field.latitude' label='Latitude Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.longitude' label='Longitude Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.country' label='Country Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.countryCode' label='Country Code Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.region' label='Region Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.province' label='Province Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.city' label='City Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.postCode' label='Post Code Field' :filter='getKeys'/>"
		+ "	<n-form-combo v-model='field.street' label='Street Field' :filter='getKeys'/>"
		+ "	<n-form-switch v-model='field.streetIncludeNumber' label='Include Street Number' v-if='field.street && !field.streetNumber'/>"
		+ "	<n-form-combo v-model='field.streetNumber' label='Street Number Field' :filter='getKeys' v-if='!field.streetIncludeNumber'/>"
		+ "	<n-form-combo v-model='field.formatted' label='Fully Formatted Address Field' :filter='getKeys'/>"
		+ " <n-form-switch v-model='field.allowVague' label='Allow Vague Addresses'/>"
		+ " <n-form-switch v-model='field.required' label='Required'/>"
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
		},
		possibleFields: {
			type: Array,
			required: false,
			default: function() { return [] }
		}
	},
	created: function() {
		if (!this.field.textType) {
			Vue.set(this.field, "textType", null);
		}
	},
	methods: {
		getKeys: function(value) {
			return this.possibleFields.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			})
		}
	}
});

Vue.component("page-form-input-location", {
	template: "<n-form-location ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:placeholder='placeholder'"
			+ "		:schema='schema'"
			+ "		v-bubble:label"
			+ "		:required='field.required'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:name='field.name'"
			+ "		:timeout='timeout'"
			+ "     :latitude='field.latitude'"
			+ "     :longitude='field.longitude'"
			+ "     :country='field.country'"
			+ "     :country-code='field.countryCode'"
			+ "     :province='field.province'"
			+ "     :region='field.region'"
			+ "     :city='field.city'"
			+ "     :post-code='field.postCode'"
			+ "     :street='field.street'"
			+ "     :street-include-number='field.streetIncludeNumber'"
			+ "     :street-number='field.streetNumber'"
			+ "     :formatted='field.formatted'"
			+ "		:country-restriction='field.countryRestriction'"
			+ "     :allow-vague='field.allowVague'"
			+ "		:disabled='disabled'/>",
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
	methods: {
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});